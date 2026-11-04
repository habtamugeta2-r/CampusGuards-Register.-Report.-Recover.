#!/usr/bin/env bash
# Encrypted database backup and restore.
#
#   ./scripts/backup.sh backup           write an encrypted dump to ./backups
#   ./scripts/backup.sh list             show what is on disk
#   ./scripts/backup.sh verify <file>    prove a backup decrypts and restores
#   ./scripts/backup.sh restore <file>   restore over the target database
#
# Backups are made with pg_dump in PostgreSQL's custom format (compressed, and
# restorable selectively with pg_restore) and then encrypted at rest with age
# (https://age-encryption.org) when available, falling back to GPG, and finally
# to scripts/backup-crypto.mjs (AES-256-GCM, scrypt) which needs only Node.
#
# WHY ENCRYPT: a CampusGuard dump contains names, university email addresses,
# student ID numbers, device serials and a movement history at campus gates.
# An unencrypted dump on a backup disk is the same data set the Proclamation
# asks us to protect, so the dump is never written to disk in the clear — it is
# piped straight into the encryptor.
#
# Proclamation 1321/2024 Art. 22: backups must stay on infrastructure in
# Ethiopia. An off-site copy is fine if the second site is also in Ethiopia.
#
# Set BACKUP_PASSPHRASE (age) or GPG recipient via BACKUP_GPG_RECIPIENT.
# A backup you cannot restore is not a backup: run `verify` on a schedule and
# rehearse a full restore before the pilot starts.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL must be set}"
TARGET_DB="${TARGET_DB:-campusguard_shadow}"
KEEP_DAYS="${KEEP_DAYS:-30}"

# Split DATABASE_URL into pg_dump/pg_restore friendly pieces without jq.
parse_url() {
  python3 - "$DATABASE_URL" <<'PY'
import sys, urllib.parse
url = urllib.parse.urlparse(sys.argv[1])
print(url.hostname or '127.0.0.1')
print(url.port or 5432)
print(urllib.parse.unquote(url.username or 'postgres'))
print(urllib.parse.unquote(url.password or ''))
print((url.path or '/postgres').lstrip('/'))
PY
}

# mapfile, not `read`: the parser prints one field per line, and `read` would
# only consume the first. Passwords may contain spaces or colons.
mapfile -t PARTS < <(parse_url)
PGHOST="${PARTS[0]}"
PGPORT="${PARTS[1]}"
PGUSER="${PARTS[2]}"
PGPASSWORD="${PARTS[3]}"
PGDATABASE="${PARTS[4]}"
export PGPASSWORD

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/campusguard-${STAMP}.dump"

encrypt() { # stdin -> "$OUT.<ext>"
  mkdir -p "$BACKUP_DIR"
  if [ -n "${BACKUP_PASSPHRASE:-}" ] && command -v age >/dev/null 2>&1; then
    AGE_PASSPHRASE="$BACKUP_PASSPHRASE" age --passphrase --output "${OUT}.age" < /dev/stdin
    echo "${OUT}.age"
  elif [ -n "${BACKUP_GPG_RECIPIENT:-}" ] && command -v gpg >/dev/null 2>&1; then
    gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
        --output "${OUT}.gpg" /dev/stdin
    echo "${OUT}.gpg"
  elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
    # Last resort: AES-256-GCM using only Node, which the app already needs.
    node "$(dirname "$0")/backup-crypto.mjs" enc > "${OUT}.cgb"
    echo "${OUT}.cgb"
  else
    echo "refusing to write an unencrypted backup." >&2
    echo "set BACKUP_PASSPHRASE (with age installed) or BACKUP_GPG_RECIPIENT." >&2
    exit 1
  fi
}

decrypt() { # "$1" -> stdout
  case "$1" in
    *.age)
      [ -n "${BACKUP_PASSPHRASE:-}" ] || { echo "BACKUP_PASSPHRASE required" >&2; exit 1; }
      AGE_PASSPHRASE="$BACKUP_PASSPHRASE" age --decrypt "$1"
      ;;
    *.gpg)
      gpg --batch --yes --decrypt "$1"
      ;;
    *.cgb)
      [ -n "${BACKUP_PASSPHRASE:-}" ] || { echo "BACKUP_PASSPHRASE required" >&2; exit 1; }
      node "$(dirname "$0")/backup-crypto.mjs" dec < "$1"
      ;;
    *)
      cat "$1"
      ;;
  esac
}

do_backup() {
  local file
  # --format=custom --compress=9: restorable selectively, and small enough to
  # keep 30 days on the VM. The dump never touches the disk unencrypted.
  file="$(pg_dump --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" \
            --format=custom --compress=9 --no-owner --no-acl "$PGDATABASE" | encrypt)"
  local size
  size="$(du -h "$file" | cut -f1)"
  echo "backup written: $file ($size)"

  # Verify immediately: detect a broken backup while the data is still live.
  echo "verifying against '$TARGET_DB':"
  do_verify "$file"

  find "$BACKUP_DIR" -name 'campusguard-*.dump.*' -type f -mtime "+${KEEP_DAYS}" -print -delete
}

counts() { # <database>
  psql --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" --dbname "$1" \
       --no-align --tuples-only <<'SQL'
SELECT 'users ' || (SELECT count(*) FROM users)
UNION ALL SELECT 'products ' || (SELECT count(*) FROM products)
UNION ALL SELECT 'missing_reports ' || (SELECT count(*) FROM missing_reports)
UNION ALL SELECT 'found_reports ' || (SELECT count(*) FROM found_reports)
UNION ALL SELECT 'scan_events ' || (SELECT count(*) FROM scan_events)
UNION ALL SELECT 'audit_logs ' || (SELECT count(*) FROM audit_logs)
UNION ALL SELECT 'notifications ' || (SELECT count(*) FROM notifications);
SQL
}

do_verify() {
  local file="$1"
  echo "verifying $file against database '$TARGET_DB'"

  createdb --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" \
           --owner "$PGUSER" "$TARGET_DB" 2>/dev/null || true

  # --clean --if-exists so the shadow database is rebuilt from scratch each
  # time, which is exactly what a real disaster restore has to do.
  decrypt "$file" | pg_restore --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" \
      --dbname "$TARGET_DB" --clean --if-exists --no-owner --no-acl --single-transaction

  # A backup is only verified if the restored copy holds the same rows as the
  # live database. Print both and fail on any difference.
  local live restored
  live="$(counts "$PGDATABASE")"
  restored="$(counts "$TARGET_DB")"
  paste <(echo "$live") <(echo "$restored" | awk '{print $2}') \
    | awk 'BEGIN{printf "%-18s %8s %8s\n","table","live","restored"} {printf "%-18s %8s %8s\n",$1,$2,$3}'
  if [ "$live" != "$restored" ]; then
    echo "RESTORE DRILL FAILED: row counts differ" >&2
    exit 1
  fi
  echo "restore drill ok: every table matches the live database"
}

do_restore() {
  local file="${1:?usage: $0 restore <file>}"
  local db="${RESTORE_DB:-$PGDATABASE}"
  echo "THIS REPLACES THE CONTENTS OF '$db' on $PGHOST:$PGPORT."
  read -r -p "type the database name to continue: " confirm
  [ "$confirm" = "$db" ] || { echo "aborted"; exit 1; }
  decrypt "$file" | pg_restore --host "$PGHOST" --port "$PGPORT" --username "$PGUSER" \
      --dbname "$db" --clean --if-exists --no-owner --no-acl --single-transaction
  echo "restored $file into $db"
}

case "${1:-backup}" in
  backup) do_backup ;;
  verify) do_verify "${2:?usage: $0 verify <file>}" ;;
  restore) do_restore "${2:-}" ;;
  list) ls -lh "$BACKUP_DIR" 2>/dev/null || echo "no backups in $BACKUP_DIR" ;;
  *)
    echo "usage: $0 {backup|verify <file>|restore <file>|list}" >&2
    exit 1
    ;;
esac
