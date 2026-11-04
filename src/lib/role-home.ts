import type { Role } from './types';

/** Where each role lands after signing in. */
export function roleHome(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SECURITY':
      return '/security';
    default:
      return '/student';
  }
}
