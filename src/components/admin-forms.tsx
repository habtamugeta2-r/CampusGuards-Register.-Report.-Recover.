'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Spinner } from './ui';
import { apiPatch, apiPost, apiDelete } from '@/lib/client/api';
import type { Role, UserStatus } from '@/lib/types';

type Feedback = { error?: string; notice?: string; pending: boolean };

export function ResolveReportForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
        Close report
      </button>
    );
  }

  return (
    <form
      className="w-72 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPatch(`/api/reports/missing/${reportId}`, {
            status: form.get('status'),
            notes: form.get('notes'),
          });
          setState({ pending: false, notice: 'Report updated.' });
          setOpen(false);
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <select name="status" className="select" defaultValue="RESOLVED_RECOVERED">
        <option value="RESOLVED_RECOVERED">Recovered — returned to owner</option>
        <option value="CLOSED_UNFOUND">Closed — not found</option>
        <option value="WITHDRAWN">Withdrawn by owner</option>
        <option value="FALSE_REPORT">False report</option>
      </select>
      <textarea
        name="notes"
        rows={2}
        className="input"
        placeholder="What happened? This is recorded in the audit log and shown to the owner."
      />
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={state.pending}>
          {state.pending ? <Spinner label="Saving…" /> : 'Save outcome'}
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FoundActionForm({
  foundId,
  hasMatch,
  missingReports,
}: {
  foundId: string;
  hasMatch: boolean;
  missingReports: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  return (
    <form
      className="w-72 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPatch(`/api/reports/found/${foundId}`, {
            action: hasMatch ? 'return' : form.get('action'),
            missingReportId: form.get('missingReportId') || undefined,
            custodyLocation: form.get('custodyLocation'),
            notes: form.get('notes'),
          });
          setState({ pending: false, notice: 'Updated.' });
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {!hasMatch ? (
        <select name="action" className="select" defaultValue="match">
          <option value="match">Link to a missing report</option>
          <option value="return">Mark as returned / disposed</option>
        </select>
      ) : null}
      {!hasMatch ? (
        <select name="missingReportId" className="select">
          <option value="">Choose a report…</option>
          {missingReports.map((report) => (
            <option key={report.id} value={report.id}>
              {report.label}
            </option>
          ))}
        </select>
      ) : null}
      <input name="custodyLocation" className="input" placeholder="Collection point (e.g. Library front desk)" />
      <textarea name="notes" rows={2} className="input" placeholder="Notes for the record" />
      <button className="btn-primary btn-sm" disabled={state.pending}>
        {state.pending ? <Spinner label="Saving…" /> : hasMatch ? 'Mark as returned' : 'Save'}
      </button>
    </form>
  );
}

export function UserRowActions({
  userId,
  role,
  status,
  isSelf,
}: {
  userId: string;
  role: Role;
  status: UserStatus;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/users/${userId}`, body);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (isSelf) return <span className="text-xs text-slate-400">You</span>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="select btn-sm w-auto py-1"
        value={role}
        disabled={pending}
        onChange={(event) => patch({ role: event.target.value })}
      >
        <option value="STUDENT">Student</option>
        <option value="SECURITY">Security</option>
        <option value="ADMIN">Admin</option>
      </select>
      <select
        className="select btn-sm w-auto py-1"
        value={status}
        disabled={pending}
        onChange={(event) => patch({ status: event.target.value })}
      >
        <option value="ACTIVE">Active</option>
        <option value="PENDING">Pending</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="DISABLED">Disabled</option>
      </select>
      <button
        className="btn-danger btn-sm"
        disabled={pending}
        onClick={async () => {
          const reason = window.prompt('Reason for deletion (recorded in the audit log):');
          if (!reason) return;
          setPending(true);
          try {
            await apiDelete(`/api/admin/users/${userId}?reason=${encodeURIComponent(reason)}`);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        Delete
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}

export function CheckpointForm() {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPost('/api/checkpoints', { name: form.get('name'), location: form.get('location') });
          setState({ pending: false });
          event.currentTarget.reset();
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      <div>
        <label className="label" htmlFor="cp-name">
          Name
        </label>
        <input id="cp-name" name="name" required className="input" placeholder="Main Library — exit" />
      </div>
      <div>
        <label className="label" htmlFor="cp-location">
          Location
        </label>
        <input id="cp-location" name="location" className="input" placeholder="Ground floor, north doors" />
      </div>
      <button className="btn-primary" disabled={state.pending}>
        {state.pending ? <Spinner label="Adding…" /> : 'Add checkpoint'}
      </button>
      {state.error ? <span className="text-sm text-red-700">{state.error}</span> : null}
    </form>
  );
}

export function CheckpointToggle({ checkpointId, isActive }: { checkpointId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-secondary btn-sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await apiPatch(`/api/checkpoints/${checkpointId}`, { isActive: !isActive });
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  );
}

export function SettingsForm({
  initial,
}: {
  initial: {
    scanRetentionDays: number;
    reportRetentionDays: number;
    auditRetentionDays: number;
    requireScanJustification: boolean;
    allowAggregateAnalytics: boolean;
  };
}) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPatch('/api/admin/settings', {
            scanRetentionDays: Number(form.get('scanRetentionDays')),
            reportRetentionDays: Number(form.get('reportRetentionDays')),
            auditRetentionDays: Number(form.get('auditRetentionDays')),
            requireScanJustification: form.get('requireScanJustification') === 'on',
            allowAggregateAnalytics: form.get('allowAggregateAnalytics') === 'on',
          });
          setState({ pending: false, notice: 'Settings saved.' });
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok">{state.notice}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="scanRetentionDays">
            Scan records kept (days)
          </label>
          <input
            id="scanRetentionDays"
            name="scanRetentionDays"
            type="number"
            min={7}
            max={1095}
            className="input"
            defaultValue={initial.scanRetentionDays}
          />
          <p className="mt-1 text-xs text-slate-500">Shorter is safer. 90 days is enough for incident follow-up.</p>
        </div>
        <div>
          <label className="label" htmlFor="reportRetentionDays">
            Reports anonymised after (days)
          </label>
          <input
            id="reportRetentionDays"
            name="reportRetentionDays"
            type="number"
            min={30}
            max={3650}
            className="input"
            defaultValue={initial.reportRetentionDays}
          />
        </div>
        <div>
          <label className="label" htmlFor="auditRetentionDays">
            Audit logs kept (days)
          </label>
          <input
            id="auditRetentionDays"
            name="auditRetentionDays"
            type="number"
            min={90}
            max={3650}
            className="input"
            defaultValue={initial.auditRetentionDays}
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="requireScanJustification"
          defaultChecked={initial.requireScanJustification}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        Require a written justification before anyone can view an individual student’s scan history.
      </label>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowAggregateAnalytics"
          defaultChecked={initial.allowAggregateAnalytics}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        Allow aggregate analytics on checkpoint activity. Movement analysis of individuals stays prohibited either way.
      </label>

      <button className="btn-primary" disabled={state.pending}>
        {state.pending ? <Spinner label="Saving…" /> : 'Save settings'}
      </button>
    </form>
  );
}

export function ScanHistoryLookup() {
  const [rows, setRows] = useState<Array<Record<string, unknown>> | null>(null);
  const [state, setState] = useState<Feedback>({ pending: false });

  return (
    <div className="space-y-3">
      <form
        className="grid gap-2 sm:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const params = new URLSearchParams({
            identifier: String(form.get('identifier') ?? ''),
            justification: String(form.get('justification') ?? ''),
          });
          setState({ pending: true });
          try {
            const response = await fetch(`/api/admin/scan-history?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? 'Lookup failed');
            setRows(data.rows);
            setState({ pending: false });
          } catch (error) {
            setRows(null);
            setState({ pending: false, error: (error as Error).message });
          }
        }}
      >
        <input name="identifier" className="input" placeholder="Student ID or email" required />
        <input name="justification" className="input" placeholder="Why do you need this? (recorded)" required />
        <button className="btn-primary" disabled={state.pending}>
          {state.pending ? <Spinner label="Looking up…" /> : 'Look up history'}
        </button>
      </form>

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {rows ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">When</th>
                <th className="th">Checkpoint</th>
                <th className="th">Device</th>
                <th className="th">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <td className="td whitespace-nowrap">{String(row.recorded_at).replace('T', ' ').slice(0, 19)}</td>
                  <td className="td">{String(row.checkpoint_name ?? '—')}</td>
                  <td className="td">{String(row.product_label ?? '—')}</td>
                  <td className="td">{String(row.result)}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="td" colSpan={4}>
                    No scans recorded for this student.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
