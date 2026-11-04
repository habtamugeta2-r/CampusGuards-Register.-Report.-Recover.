import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getPageSession } from '@/lib/auth';
import { SettingsForm } from '@/components/admin-forms';
import { lastRetentionRun } from '@/lib/retention';
import { queryOne } from '@/lib/db';
import { Alert, Card, CardHeader, PageHeader } from '@/components/ui';
import { formatDate, formatDateTime, percent } from '@/lib/format';
import type { BaselineMetric } from '@/lib/types';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await getPageSession(['ADMIN']);
  const institution = session.institution;
  const [retention, baseline] = await Promise.all([
    lastRetentionRun(institution.id),
    queryOne<BaselineMetric>(
      'SELECT * FROM baseline_metrics WHERE institution_id = $1 ORDER BY period_end DESC LIMIT 1',
      [institution.id],
    ),
  ]);

  return (
    <AppShell roles={['ADMIN']}>
      <PageHeader
        title="Settings & governance"
        description="Retention, justification rules, the pre-pilot baseline and the pilot data export."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Retention & governance</h2>
            <p className="mt-1 text-sm text-slate-600">
              These values are promises made to students. Shortening them is easy; lengthening them needs a fresh
              conversation with the university’s data-protection officer.
            </p>
            <div className="mt-4">
              <SettingsForm
                initial={{
                  scanRetentionDays: institution.scan_retention_days,
                  reportRetentionDays: institution.report_retention_days,
                  auditRetentionDays: institution.audit_retention_days,
                  requireScanJustification: institution.require_scan_justification,
                  allowAggregateAnalytics: institution.allow_aggregate_analytics,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Deletion runs nightly via <code className="code-chip">npm run retention</code>.{' '}
              {retention
                ? `Last run: ${formatDateTime(retention.ran_at)} (${retention.notes ?? ''}).`
                : 'It has not run yet in this environment.'}
            </p>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Pilot data export</h2>
            <p className="mt-1 text-sm text-slate-600">
              Three CSV extracts for the evaluation pack. None of them contains student names, emails or phone numbers.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/export?type=summary" className="btn-secondary btn-sm">
                Summary metrics
              </Link>
              <Link href="/admin/export?type=reports" className="btn-secondary btn-sm">
                Incident reports
              </Link>
              <Link href="/admin/export?type=scans" className="btn-secondary btn-sm">
                Scan log
              </Link>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Pre-pilot baseline</h2>
            {baseline ? (
              <dl className="mt-2 space-y-1 text-sm text-slate-700">
                <div className="flex justify-between">
                  <dt>Period</dt>
                  <dd>
                    {formatDate(baseline.period_start)} – {formatDate(baseline.period_end)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Incidents reported</dt>
                  <dd>{baseline.incidents_reported}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Recovered</dt>
                  <dd>{baseline.incidents_recovered}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Recovery rate</dt>
                  <dd className="font-medium">{percent(baseline.incidents_recovered, baseline.incidents_reported)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Median recovery</dt>
                  <dd>{baseline.median_recovery_hours ?? '—'} h</dd>
                </div>
                <p className="mt-2 text-xs text-slate-500">{baseline.source}</p>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No baseline recorded. Without one, the pilot cannot show improvement — only activity.
              </p>
            )}
            <div className="mt-3">
              <Alert tone="warn" title="Record the baseline before you start">
                Take the numbers from the university’s own security logbooks, covering the equivalent period before the
                pilot, and enter them here before the first device is registered.
              </Alert>
            </div>
          </Card>

          <Card className="card-pad">
            <h2 className="text-base font-semibold text-slate-900">Institution</h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-700">
              <div className="flex justify-between">
                <dt>Name</dt>
                <dd className="text-right">{institution.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Email domain</dt>
                <dd>{institution.email_domain}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Timezone</dt>
                <dd>{institution.timezone}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
