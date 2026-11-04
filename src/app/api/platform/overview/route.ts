import { route, ok } from '@/lib/http';
import { requirePlatformAdmin } from '@/lib/auth';
import { listInstitutionRows, platformOverview, listPlatformAudit } from '@/lib/repos/platform';

export const dynamic = 'force-dynamic';

/**
 * Platform console data.
 *
 * Counts only. A platform operator can see that an organisation exists, what
 * kind it is, how many people and devices it has registered, and whether its
 * licence is about to lapse — but never who those people are. Institution
 * administrators stay in control of their own registry; the operator's job is
 * provisioning and billing, not reading anyone's data.
 */
export const GET = route(async () => {
  await requirePlatformAdmin();
  const [overview, institutions, audit] = await Promise.all([
    platformOverview(),
    listInstitutionRows(),
    listPlatformAudit(25),
  ]);
  return ok({ overview, institutions, audit });
});
