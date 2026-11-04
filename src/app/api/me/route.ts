import { route, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { listConsents, listDataSubjectRequests } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const session = await requireUser();
  const [consents, requests] = await Promise.all([
    listConsents(session.user.id),
    listDataSubjectRequests(session.user.id),
  ]);
  return ok({
    user: session.user,
    institution: session.institution,
    profile: session.profile,
    consents,
    requests,
    retention: {
      scanDays: session.institution.scan_retention_days,
      reportDays: session.institution.report_retention_days,
      auditDays: session.institution.audit_retention_days,
    },
  });
});
