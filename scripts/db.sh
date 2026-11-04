#!/usr/bin/env bash
# Local development database.
#
#   ./scripts/db.sh up      ensure a PostgreSQL server is running and create the database
#   ./scripts/db.sh down    stop the server
#   ./scripts/db.sh psql    open a psql shell
#
# Uses pgserver (pip install pgserver) so that no system package or Docker is
# required. In production you will point DATABASE_URL at a real, Ethiopian-hosted
# PostgreSQL instance instead — see docs/03-operations/deployment.md.
set -euo pipefail

PGDATA="${PGDATA:-$HOME/.pgdata}"
DB_NAME="${DB_NAME:-campusguard}"
DB_USER="${DB_USER:-campusguard}"
DB_PASSWORD="${DB_PASSWORD:-campusguard_dev_pw}"
PORT="${PGPORT:-5432}"

bin_dir() {
  python3 -c "import pgserver, os; print(os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin'))"
}

ensure_running() {
  local bin
  bin="$(bin_dir)"
  if [ ! -d "$PGDATA" ]; then
    echo "initialising cluster in $PGDATA"
    python3 -c "import pgserver, pathlib; pgserver.get_server(pathlib.Path('$PGDATA'))" >/dev/null
  fi
  if ! "$bin/pg_isready" -h 127.0.0.1 -p "$PORT" -q 2>/dev/null; then
    echo "starting postgres on 127.0.0.1:$PORT"
    mkdir -p "$PGDATA"
    "$bin/pg_ctl" -D "$PGDATA" -l /tmp/campusguard-postgres.log \
      -o "-h 127.0.0.1 -p $PORT -k $PGDATA" start -w
  fi
  "$bin"/psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -tc \
    "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 ||
    "$bin"/psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c \
      "CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD' SUPERUSER CREATEDB"

  for db in "$DB_NAME" "${DB_NAME}_shadow"; do
    "$bin"/psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -lqt | cut -d'|' -f1 | grep -qw "$db" ||
      "$bin"/psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -c "CREATE DATABASE $db OWNER $DB_USER"
  done
  echo "database ready: postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:$PORT/$DB_NAME"
}

case "${1:-up}" in
  up) ensure_running ;;
  down)
    "$(bin_dir)/pg_ctl" -D "$PGDATA" stop -w || true
    echo "stopped"
    ;;
  psql)
    ensure_running >/dev/null
    PGPASSWORD="$DB_PASSWORD" "$(bin_dir)/psql" -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d "$DB_NAME"
    ;;
  *)
    echo "usage: $0 {up|down|psql}" >&2
    exit 1
    ;;
esac
