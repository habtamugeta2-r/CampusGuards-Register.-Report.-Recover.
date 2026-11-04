import { route, ok, clientIp, userAgent } from '@/lib/http';
import { requireCountryRead } from '@/lib/auth';
import { countryOverview } from '@/lib/repos/platform';
import { logPlatformAudit } from '@/lib/repos/platform';

export const dynamic = 'force-dynamic';

/**
 * The country scoreboard: how the platform is doing across every organisation
 * in one country.
 *
 * Built for a ministry, a regulator or a university federation that has to
 * answer "is this working?" — not "who owns what?". It returns counts per
 * organisation (names included, because a national view that could not compare
 * institutions would be useless) and totals for the country. It returns no
 * person, no device, no scan record and no serial number.
 *
 * A PLATFORM_ADMIN may ask for any country. A COUNTRY_ADMIN is pinned to the
 * one in their grant.
 */
export const GET = route(async (req: Request) => {
  const requested = new URL(req.url).searchParams.get('country');
  const { session, country } = await requireCountryRead(requested);

  const overview = await countryOverview(country);

  await logPlatformAudit({
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    action: 'platform.country_overview',
    entityType: 'country',
    entityId: country,
    metadata: { matchedOrganisations: overview.matchedOrganisations },
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ country, overview });
});
