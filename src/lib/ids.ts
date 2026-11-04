import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Sortable-ish, URL-safe, prefix-tagged identifiers (usr_…, prd_…, rep_…).
 * Prefixes make identifiers self-describing in logs, audit rows and support
 * conversations — which matters when a university administrator is reading them.
 */
export function newId(prefix: string, length = 20): string {
  let out = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}_${out}`;
}

export const id = {
  institution: () => newId('ins'),
  domain: () => newId('ind'),
  request: () => newId('irq'),
  user: () => newId('usr'),
  profile: () => newId('prf'),
  session: () => newId('ses'),
  invitation: () => newId('inv'),
  product: () => newId('prd'),
  identifier: () => newId('pid'),
  ownership: () => newId('own'),
  borrow: () => newId('brw'),
  missingReport: () => newId('mre'),
  foundReport: () => newId('fre'),
  checkpoint: () => newId('chk'),
  scan: () => newId('scn'),
  notification: () => newId('ntf'),
  audit: () => newId('aud'),
  consent: () => newId('cns'),
  dataRequest: () => newId('dsr'),
  setting: () => newId('stg'),
  baseline: () => newId('bsl'),
  retention: () => newId('rtn'),
};
