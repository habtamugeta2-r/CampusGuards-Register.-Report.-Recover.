#!/usr/bin/env node
/**
 * Streaming authenticated encryption for database backups.
 *
 *   node scripts/backup-crypto.mjs enc   < dump > dump.age   # BACKUP_PASSPHRASE
 *   node scripts/backup-crypto.mjs dec   < dump.age > dump
 *
 * backup.sh prefers `age` and `gpg` when they are installed. This is the
 * fallback for machines that have neither, which includes most minimal server
 * images — and a project that runs on one Ethiopian VM needs a backup it can
 * actually take. Node is already a hard dependency of the application, so this
 * adds nothing to install.
 *
 * Format (all big-endian, no padding):
 *   "CGBKUP01" | salt(16) | nonce(12) | ciphertext | GCM tag(16)
 *
 * Key derivation is scrypt (N=2^15, r=8, p=1); the cipher is AES-256-GCM, so a
 * tampered or truncated backup fails to decrypt loudly rather than restoring
 * silently corrupted data.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const MAGIC = Buffer.from('CGBKUP01', 'ascii');
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + NONCE_BYTES;

const mode = process.argv[2];

function keyFor(passphrase, salt) {
  return scryptSync(passphrase, salt, KEY_BYTES, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

function usage(message) {
  process.stderr.write(`${message}\nusage: backup-crypto.mjs {enc|dec}\n`);
  process.exit(1);
}

async function encrypt(passphrase) {
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyFor(passphrase, salt), nonce);

  process.stdout.write(MAGIC);
  process.stdout.write(salt);
  process.stdout.write(nonce);

  for await (const chunk of process.stdin) {
    process.stdout.write(cipher.update(chunk));
  }
  process.stdout.write(cipher.final());
  process.stdout.write(cipher.getAuthTag());
}

async function decrypt(passphrase) {
  // The header is read first, then everything except the trailing 16-byte tag
  // is streamed through the decipher. Only the last TAG_BYTES are held back,
  // so a multi-gigabyte dump never has to fit in memory.
  let head = Buffer.alloc(0);
  let header = null;
  let pending = Buffer.alloc(0);
  let decipher = null;

  for await (let chunk of process.stdin) {
    if (!header) {
      head = head.length ? Buffer.concat([head, chunk]) : chunk;
      if (head.length < HEADER_BYTES) continue;
      header = parseHeader(head);
      decipher = createDecipheriv('aes-256-gcm', keyFor(passphrase, header.salt), header.nonce);
      chunk = head.subarray(HEADER_BYTES);
    } else {
      chunk = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    }
    if (chunk.length === 0) continue;

    const keep = Math.min(TAG_BYTES, chunk.length);
    const ready = chunk.subarray(0, chunk.length - keep);
    pending = chunk.subarray(chunk.length - keep);
    if (ready.length) process.stdout.write(decipher.update(ready));
  }

  if (!decipher) usage('backup is truncated: no header');
  if (pending.length !== TAG_BYTES) usage('backup is truncated: missing authentication tag');

  decipher.setAuthTag(pending);
  process.stdout.write(decipher.final());
}

function parseHeader(buffer) {
  if (!buffer.subarray(0, MAGIC.length).equals(MAGIC)) {
    usage('not a CampusGuard encrypted backup (bad magic)');
  }
  return {
    salt: buffer.subarray(MAGIC.length, MAGIC.length + SALT_BYTES),
    nonce: buffer.subarray(MAGIC.length + SALT_BYTES, HEADER_BYTES),
  };
}

async function main() {
  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (!passphrase) usage('BACKUP_PASSPHRASE is not set');

  if (mode === 'enc') await encrypt(passphrase);
  else if (mode === 'dec') await decrypt(passphrase);
  else usage(`unknown mode: ${mode}`);
}

main().catch((error) => {
  process.stderr.write(`backup-crypto: ${error.message}\n`);
  process.exit(2);
});
