import type { PlatformRole, Role } from './types';

/**
 * Where each role lands after signing in.
 *
 * A platform operator lands on the platform console, not on their own
 * organisation's dashboard: their default view is the whole deployment, and
 * they can reach their own organisation from there.
 */
export function roleHome(role: Role, platformRole: PlatformRole = 'NONE'): string {
  if (platformRole === 'PLATFORM_ADMIN') return '/platform';
  // A country operator's whole view is their country; there is nothing else
  // in the console they are allowed to open.
  if (platformRole === 'COUNTRY_ADMIN') return '/platform/country';
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SECURITY':
      return '/security';
    default:
      return '/student';
  }
}
