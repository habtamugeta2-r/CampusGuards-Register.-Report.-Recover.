import { route, ok, readJson, clientIp, userAgent } from '@/lib/http';
import { institutionSettingsSchema } from '@/lib/validation';
import { requireRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { updateInstitutionSettings } from '@/lib/repos/misc';

export const dynamic = 'force-dynamic';

/**
 * Governance settings are themselves audited: if retention windows change,
 * there must be a record of who changed them and when.
 */
export const PATCH = route(async (req: Request) => {
  const session = await requireRole('ADMIN');
  const body = institutionSettingsSchema.parse(await readJson(req));

  await updateInstitutionSettings(session.institution.id, {
    scan_retention_days: body.scanRetentionDays,
    report_retention_days: body.reportRetentionDays,
    audit_retention_days: body.auditRetentionDays,
    require_scan_justification: body.requireScanJustification,
    allow_aggregate_analytics: body.allowAggregateAnalytics,
  });

  await logAudit({
    institutionId: session.institution.id,
    actorId: session.user.id,
    actorRole: session.role,
    action: 'institution.settings_update',
    entityType: 'institution',
    entityId: session.institution.id,
    metadata: body as never,
    ip: clientIp(req),
    userAgent: userAgent(req),
  });

  return ok({ ok: true });
});
