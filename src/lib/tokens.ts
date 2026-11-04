import { randomBytes, createHash } from 'node:crypto';

/**
 * QR tokens are opaque, unguessable and contain NO personal data. Anyone who
 * scans a CampusGuard label with an ordinary camera app sees only a random
 * string (and a URL to the public status page). Nothing about the student,
 * their ID number or their device is encoded in the code.
 *
 * Format: CG-XXXXXXXXXXXXXXXXXXXX (Crockford base32, 20 chars ≈ 100 bits)
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: no I, L, O, U
const TOKEN_LENGTH = 20;
const TOKEN_RE = /^CG-[0-9A-HJKMNP-TV-Z]{20}$/;

export function generateQrToken(): string {
  let out = '';
  const bytes = randomBytes(TOKEN_LENGTH);
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `CG-${out}`;
}

export function isValidTokenFormat(token: string): boolean {
  return TOKEN_RE.test(token);
}

/**
 * Accepts anything a human or camera might hand us:
 *   "CG-1A2B..." · "cg-1a2b..." · "https://host/s/CG-1A2B..." · " CG-... "
 * and returns the canonical token, or null when it cannot be salvaged.
 */
export function normalizeToken(raw: string): string | null {
  if (!raw) return null;
  let v = raw.trim();

  // A URL from a generic camera app.
  const urlMatch = v.match(/\/s\/([A-Za-z0-9-]+)/);
  if (urlMatch) v = urlMatch[1];

  v = v.toUpperCase().replace(/\s+/g, '');
  // Crockford normalisation: I/L → 1, O → 0
  v = v.replace(/[IL]/g, '1').replace(/O/g, '0');

  if (!v.startsWith('CG-') && /^[0-9A-Z]{20}$/.test(v)) v = `CG-${v}`;

  return isValidTokenFormat(v) ? v : null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generating a token that collides is astronomically unlikely, but the DB has a
 *  unique constraint, so callers retry a bounded number of times. */
export const MAX_TOKEN_ATTEMPTS = 5;

/** Public URL printed under the QR code (used by generic camera apps). */
export function publicScanUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return `${base}/s/${token}`;
}
