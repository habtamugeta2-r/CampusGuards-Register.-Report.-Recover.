import { redirect } from 'next/navigation';
import type { Role } from './types';
import { getSessionUser } from './session';
import { roleHome } from './role-home';
import type { SessionUser } from './types';

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'You do not have access to this resource.') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export async function getUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Throws 401 for API routes. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AuthError(401, 'You must be signed in.');
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await requireUser();
  if (!roles.includes(session.role)) {
    throw new ForbiddenError(`This action requires: ${roles.join(', ')}.`);
  }
  return session;
}

/**
 * Platform-operator guard.
 *
 * This is a separate axis from the institution role on purpose. An
 * administrator of one university must not be able to reach another
 * university's data by any route, so "can administer my organisation" and "can
 * administer the platform" are different grants, checked by different code,
 * and only the second one unlocks /platform and its API.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.platformRole !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('This action is restricted to platform operators.');
  }
  return session;
}

/** Page-level guard for /platform: redirect instead of throwing. */
export async function requirePlatformPage(): Promise<SessionUser> {
  const session = await requirePage();
  if (session.platformRole !== 'PLATFORM_ADMIN') redirect(roleHome(session.role, session.platformRole));
  return session;
}

export const getPlatformPageSession = cache(async () => requirePlatformPage());

/**
 * Anyone with a platform grant — operators and country staff — may open the
 * console shell. Individual pages then decide what each of them may see, which
 * is why this exists separately from requirePlatformPage().
 */
export async function requirePlatformShellPage(): Promise<SessionUser> {
  const session = await requirePage();
  if (session.platformRole === 'NONE') redirect(roleHome(session.role, session.platformRole));
  return session;
}

export const getPlatformShellSession = cache(async () => requirePlatformShellPage());

/**
 * Which country a platform-staff member may look at.
 *
 * A PLATFORM_ADMIN can ask for any country. A COUNTRY_ADMIN is pinned to the
 * one in their grant: a requested country is ignored rather than rejected, so
 * a country operator cannot probe for the existence of other scopes by
 * watching which requests fail.
 */
export function countryScopeFor(session: SessionUser, requested?: string | null): string {
  if (session.platformRole === 'PLATFORM_ADMIN') return requested?.trim() || session.institution.country;
  return session.platformCountry ?? session.institution.country;
}

/**
 * API guard for the country scoreboard: operators and country staff, never a
 * tenant administrator, and never a country other than the caller's own.
 */
export async function requireCountryRead(
  requested?: string | null,
): Promise<{ session: SessionUser; country: string }> {
  const session = await requireUser();
  if (session.platformRole !== 'PLATFORM_ADMIN' && session.platformRole !== 'COUNTRY_ADMIN') {
    throw new ForbiddenError('This view is restricted to platform and country staff.');
  }
  return { session, country: countryScopeFor(session, requested) };
}

/** Page-level guard: redirect instead of throwing. */
export async function requirePage(roles?: Role[]): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  if (roles && !roles.includes(session.role)) redirect(roleHome(session.role));
  return session;
}

export { roleHome };

/**
 * Per-request memoised page guard. React's `cache` deduplicates the session
 * lookup so a page and its shell can each ask for the user without a second
 * database round-trip.
 */
import { cache } from 'react';

export const getPageSession = cache(async (roles?: Role[]) => requirePage(roles));
