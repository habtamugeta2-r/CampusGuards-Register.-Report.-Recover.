import bcrypt from 'bcryptjs';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Registration policy. Deliberately moderate: long passphrases matter more than
 * symbol soup, and students on shared/low-end devices mistype exotic passwords.
 */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push('Use at least 10 characters.');
  if (password.length > 200) problems.push('Password is too long.');
  if (/\s{2,}/.test(password)) problems.push('Avoid repeated spaces.');
  return problems;
}
