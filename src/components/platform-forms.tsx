'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, apiPatch, apiDelete } from '@/lib/client/api';
import { Alert, Badge, Card, CardHeader, Spinner } from '@/components/ui';
import { DEFAULT_BRAND } from '@/lib/brand';
import {
  INSTITUTION_KINDS,
  INSTITUTION_KIND_LABEL,
  INSTITUTION_STATUSES,
  INSTITUTION_STATUS_LABEL,
} from '@/lib/constants';
import type { InstitutionDomain, InstitutionKind, InstitutionStatus } from '@/lib/types';

type Feedback = { pending?: boolean; error?: string; notice?: string };

export type Organisation = {
  id: string;
  name: string;
  code: string;
  kind: InstitutionKind;
  status: InstitutionStatus;
  country: string;
  city: string | null;
  data_region: string;
  people: number;
  devices: number;
  scans_30d: number;
  open_reports: number;
  admin_count: number;
  seat_limit: number | null;
  licence_expires_at: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  domains: string[];
};

export type Application = {
  id: string;
  organisation_name: string;
  kind: InstitutionKind;
  country: string;
  city: string | null;
  contact_name: string;
  contact_email: string;
  primary_domain: string;
  extra_domains: string[];
  estimated_people: number | null;
  message: string | null;
  status: 'NEW' | 'APPROVED' | 'REJECTED';
  created_at: string;
};

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'info'> = {
  ACTIVE: 'ok',
  TRIAL: 'info',
  SUSPENDED: 'warn',
  CLOSED: 'danger',
};

// ---------------------------------------------------------------------------
// Create an organisation
// ---------------------------------------------------------------------------

export function CreateOrganisationForm() {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({});

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPost('/api/platform/institutions', {
            name: form.get('name'),
            code: String(form.get('code') ?? '').toUpperCase(),
            kind: form.get('kind'),
            status: form.get('status'),
            country: form.get('country') || 'Ethiopia',
            city: form.get('city') || null,
            dataRegion: form.get('dataRegion') || null,
            primaryDomain: form.get('primaryDomain'),
            extraDomains: String(form.get('extraDomains') ?? '')
              .split(/[\s,]+/)
              .map((d) => d.trim())
              .filter(Boolean),
            seatLimit: form.get('seatLimit') ? Number(form.get('seatLimit')) : null,
            licenceExpiresAt: form.get('licenceExpiresAt') ? new Date(String(form.get('licenceExpiresAt'))).toISOString() : null,
          });
          setState({ pending: false, notice: 'Organisation created. People on its domain can register now.' });
          event.currentTarget.reset();
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger" live="assertive">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok" live="polite">{state.notice}</Alert> : null}

      <div className="sm:col-span-2">
        <label className="label" htmlFor="org-name">Organisation name</label>
        <input id="org-name" name="name" required className="input" placeholder="Bahir Dar University" />
      </div>

      <div>
        <label className="label" htmlFor="org-code">Short code</label>
        <input id="org-code" name="code" required className="input" placeholder="BDU" pattern="[A-Za-z0-9-]+" />
      </div>

      <div>
        <label className="label" htmlFor="org-kind">Type</label>
        <select id="org-kind" name="kind" className="select" defaultValue="UNIVERSITY">
          {INSTITUTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {INSTITUTION_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="org-domain">Primary email domain</label>
        <input id="org-domain" name="primaryDomain" required className="input" placeholder="bdu.edu.et" />
      </div>

      <div>
        <label className="label" htmlFor="org-extra">
          Other domains <span className="font-normal text-slate-500">(comma separated)</span>
        </label>
        <input id="org-extra" name="extraDomains" className="input" placeholder="bdu.edu.et, bdu.et" />
      </div>

      <div>
        <label className="label" htmlFor="org-status">Status</label>
        <select id="org-status" name="status" className="select" defaultValue="TRIAL">
          {INSTITUTION_STATUSES.filter((s) => s !== 'CLOSED').map((status) => (
            <option key={status} value={status}>
              {INSTITUTION_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="org-seats">
          Seat limit <span className="font-normal text-slate-500">(blank = unlimited)</span>
        </label>
        <input id="org-seats" name="seatLimit" type="number" min={1} className="input" placeholder="5000" />
      </div>

      <div>
        <label className="label" htmlFor="org-country">Country</label>
        <input id="org-country" name="country" className="input" defaultValue="Ethiopia" />
      </div>

      <div>
        <label className="label" htmlFor="org-city">City</label>
        <input id="org-city" name="city" className="input" placeholder="Bahir Dar" />
      </div>

      <div>
        <label className="label" htmlFor="org-region">Data region</label>
        <input
          id="org-region"
          name="dataRegion"
          className="input"
          placeholder="Ethiopia"
          aria-describedby="org-region-help"
        />
        <p id="org-region-help" className="mt-1 text-xs text-slate-500">
          Where this tenant’s data must physically be stored. Defaults to the country above.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="org-licence">Licence expires</label>
        <input id="org-licence" name="licenceExpiresAt" type="date" className="input" />
      </div>

      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={state.pending}>
          {state.pending ? <Spinner label="Creating…" /> : 'Create organisation'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Per-organisation controls: status, licence, domains
// ---------------------------------------------------------------------------

export function OrganisationRowControls({
  organisation,
  domains,
}: {
  organisation: Organisation;
  domains: InstitutionDomain[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({});
  const [newDomain, setNewDomain] = useState('');

  async function patch(body: Record<string, unknown>, notice: string) {
    setState({ pending: true });
    try {
      await apiPatch(`/api/platform/institutions/${organisation.id}`, body);
      setState({ pending: false, notice });
      router.refresh();
    } catch (error) {
      setState({ pending: false, error: (error as Error).message });
    }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
      {state.error ? <Alert tone="danger" live="assertive">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok" live="polite">{state.notice}</Alert> : null}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor={`status-${organisation.id}`}>Status</label>
          <select
            id={`status-${organisation.id}`}
            className="select btn-sm w-auto py-1"
            value={organisation.status}
            disabled={state.pending}
            onChange={(event) => void patch({ status: event.target.value }, 'Status updated.')}
          >
            {INSTITUTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {INSTITUTION_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor={`seats-${organisation.id}`}>Seats</label>
          <input
            id={`seats-${organisation.id}`}
            className="input btn-sm w-28 py-1"
            type="number"
            min={1}
            defaultValue={organisation.seat_limit ?? ''}
            placeholder="unlimited"
            onBlur={(event) =>
              void patch(
                { seatLimit: event.target.value ? Number(event.target.value) : null },
                'Seat limit updated.',
              )
            }
          />
        </div>

        <div>
          <label className="label" htmlFor={`licence-${organisation.id}`}>Licence expiry</label>
          <input
            id={`licence-${organisation.id}`}
            className="input btn-sm w-auto py-1"
            type="date"
            defaultValue={organisation.licence_expires_at ? organisation.licence_expires_at.slice(0, 10) : ''}
            onChange={(event) =>
              void patch(
                {
                  licenceExpiresAt: event.target.value
                    ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString()
                    : null,
                },
                'Licence updated.',
              )
            }
          />
        </div>

        <div>
          <label className="label" htmlFor={`region-${organisation.id}`}>Data region</label>
          <input
            id={`region-${organisation.id}`}
            className="input btn-sm w-36 py-1"
            defaultValue={organisation.data_region}
            onBlur={(event) => {
              if (event.target.value !== organisation.data_region) {
                void patch({ dataRegion: event.target.value }, 'Data region updated.');
              }
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor={`brand-${organisation.id}`}>Brand colour</label>
          <div className="flex items-center gap-1.5">
            <input
              id={`brand-${organisation.id}`}
              className="h-8 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
              type="color"
              defaultValue={organisation.brand_primary ?? DEFAULT_BRAND}
              onBlur={(event) => {
                if (event.target.value !== (organisation.brand_primary ?? DEFAULT_BRAND)) {
                  void patch({ brandPrimary: event.target.value }, 'Brand colour updated.');
                }
              }}
            />
            {organisation.brand_primary ? (
              <button
                className="text-xs text-slate-500 hover:text-red-700"
                onClick={() => void patch({ brandPrimary: null }, 'Brand colour reset to the platform default.')}
              >
                reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor={`logo-${organisation.id}`}>Logo URL</label>
        <input
          id={`logo-${organisation.id}`}
          className="input btn-sm w-full max-w-md py-1"
          defaultValue={organisation.logo_url ?? ''}
          placeholder="https://example.edu.et/logo.png"
          onBlur={(event) => {
            if (event.target.value !== (organisation.logo_url ?? '')) {
              void patch({ logoUrl: event.target.value || null }, 'Logo updated.');
            }
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Shown on the organisation’s printed labels, emails and public status page. Hosted by the organisation — this
          is a URL, not an upload.
        </p>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email domains</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          {domains.map((domain) => (
            <li key={domain.id} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-slate-200">
              <span>{domain.domain}</span>
              {domain.is_primary ? <Badge tone="neutral">primary</Badge> : null}
              {!domain.is_primary ? (
                <button
                  className="text-slate-500 hover:text-red-700"
                  aria-label={`Remove domain ${domain.domain}`}
                  onClick={async () => {
                    setState({ pending: true });
                    try {
                      await apiDelete(`/api/platform/institutions/${organisation.id}/domains`, { domainId: domain.id });
                      setState({ pending: false, notice: `Removed ${domain.domain}.` });
                      router.refresh();
                    } catch (error) {
                      setState({ pending: false, error: (error as Error).message });
                    }
                  }}
                >
                  ✕
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <form
          className="mt-2 flex items-end gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setState({ pending: true });
            try {
              await apiPost(`/api/platform/institutions/${organisation.id}/domains`, { domain: newDomain });
              setNewDomain('');
              setState({ pending: false, notice: 'Domain added.' });
              router.refresh();
            } catch (error) {
              setState({ pending: false, error: (error as Error).message });
            }
          }}
        >
          <div>
            <label className="label" htmlFor={`new-domain-${organisation.id}`}>Add a domain</label>
            <input
              id={`new-domain-${organisation.id}`}
              className="input btn-sm w-56 py-1"
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              placeholder="campus.example.edu.et"
            />
          </div>
          <button className="btn-secondary btn-sm" disabled={state.pending || !newDomain}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

export function OrganisationsConsole({
  organisations,
  domainsByInstitution,
}: {
  organisations: Organisation[];
  domainsByInstitution: Record<string, InstitutionDomain[]>;
}) {
  return (
    <div className="space-y-3">
      {organisations.map((organisation) => (
        <Card key={organisation.id}>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                {organisation.name}
                <Badge tone={STATUS_TONE[organisation.status] ?? 'neutral'}>
                  {INSTITUTION_STATUS_LABEL[organisation.status]}
                </Badge>
              </span>
            }
            subtitle={`${organisation.code} · ${INSTITUTION_KIND_LABEL[organisation.kind]} · ${organisation.city ?? organisation.country}`}
          />
          <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm sm:grid-cols-4 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">People</p>
              <p className="font-medium tabular-nums text-slate-900">
                {organisation.people}
                {organisation.seat_limit ? <span className="text-slate-500"> / {organisation.seat_limit}</span> : null}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Devices</p>
              <p className="font-medium tabular-nums text-slate-900">{organisation.devices}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Scans (30d)</p>
              <p className="font-medium tabular-nums text-slate-900">{organisation.scans_30d}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Open reports</p>
              <p className="font-medium tabular-nums text-slate-900">{organisation.open_reports}</p>
            </div>
          </div>
          <OrganisationRowControls organisation={organisation} domains={domainsByInstitution[organisation.id] ?? []} />
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applications queue
// ---------------------------------------------------------------------------

export function ApplicationCard({ application }: { application: Application }) {
  const router = useRouter();
  const [state, setState] = useState<Feedback & { credential?: string }>({});
  const [code, setCode] = useState('');

  async function decide(decision: 'APPROVED' | 'REJECTED') {
    setState({ pending: true });
    try {
      const result = await apiPost<{
        decision: string;
        institution?: { id: string; name: string; code: string };
        admin?: { email: string };
        temporaryPassword?: string;
        emailDelivered?: boolean;
      }>(`/api/platform/requests/${application.id}`, {
        decision,
        code: code || null,
        status: 'TRIAL',
      });
      setState({
        pending: false,
        notice:
          decision === 'APPROVED'
            ? `Approved. ${result.institution?.name} can now register people on ${application.primary_domain}.`
            : 'Application rejected.',
        credential:
          decision === 'APPROVED' && result.temporaryPassword
            ? `${result.admin?.email} — ${result.temporaryPassword}`
            : undefined,
      });
      router.refresh();
    } catch (error) {
      setState({ pending: false, error: (error as Error).message });
    }
  }

  return (
    <Card>
      <CardHeader
        title={application.organisation_name}
        subtitle={`${INSTITUTION_KIND_LABEL[application.kind]} · ${application.primary_domain} · ${application.city ?? application.country}`}
      />
      <div className="space-y-2 px-4 py-3 text-sm sm:px-6">
        <p className="text-slate-700">
          <span className="text-slate-500">Contact:</span> {application.contact_name} · {application.contact_email}
        </p>
        {application.estimated_people ? (
          <p className="text-slate-700">
            <span className="text-slate-500">Estimated people:</span> {application.estimated_people.toLocaleString('en-ET')}
          </p>
        ) : null}
        {application.extra_domains?.length ? (
          <p className="text-slate-700">
            <span className="text-slate-500">Other domains:</span> {application.extra_domains.join(', ')}
          </p>
        ) : null}
        {application.message ? <p className="whitespace-pre-line text-slate-700">{application.message}</p> : null}
        <p className="text-xs text-slate-500">Applied {new Date(application.created_at).toLocaleString('en-ET')}</p>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
        {state.error ? <Alert tone="danger" live="assertive">{state.error}</Alert> : null}
        {state.notice ? <Alert tone="ok" live="polite">{state.notice}</Alert> : null}
        {state.credential ? (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-semibold">First administrator — copy this now, it is not shown again</p>
            <p className="mt-1 font-mono text-xs">{state.credential}</p>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div>
            <label className="label" htmlFor={`code-${application.id}`}>Organisation code</label>
            <input
              id={`code-${application.id}`}
              className="input btn-sm w-32 py-1"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="auto"
            />
          </div>
          <button className="btn-primary btn-sm" disabled={state.pending} onClick={() => void decide('APPROVED')}>
            {state.pending ? <Spinner label="Working…" /> : 'Approve and provision'}
          </button>
          <button className="btn-danger btn-sm" disabled={state.pending} onClick={() => void decide('REJECTED')}>
            Reject
          </button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// An organisation editing its own profile
// ---------------------------------------------------------------------------

/**
 * Deliberately narrow: an organisation may change its name and location, but
 * not its type, status, seat limit, licence or email domains. Those are
 * platform-operator decisions — an administrator who could self-issue a licence
 * or claim another domain would not need the platform at all.
 */
export function OrganisationProfileForm({
  initial,
}: {
  initial: {
    name: string;
    city: string | null;
    country: string;
    timezone: string;
    logoUrl: string | null;
    brandPrimary: string | null;
  };
}) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({});
  const [colour, setColour] = useState(initial.brandPrimary ?? DEFAULT_BRAND);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPatch('/api/admin/organisation', {
            name: form.get('name'),
            city: form.get('city') || null,
            country: form.get('country'),
            timezone: form.get('timezone'),
            logoUrl: form.get('logoUrl') || null,
            brandPrimary: colour,
          });
          setState({ pending: false, notice: 'Organisation profile updated.' });
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger" live="assertive">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok" live="polite">{state.notice}</Alert> : null}

      <div>
        <label className="label" htmlFor="profile-name">Name</label>
        <input id="profile-name" name="name" required className="input" defaultValue={initial.name} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="profile-city">City</label>
          <input id="profile-city" name="city" className="input" defaultValue={initial.city ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="profile-country">Country</label>
          <input id="profile-country" name="country" required className="input" defaultValue={initial.country} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="profile-timezone">Timezone</label>
        <input
          id="profile-timezone"
          name="timezone"
          required
          className="input"
          defaultValue={initial.timezone}
          placeholder="Africa/Addis_Ababa"
        />
      </div>

      <div>
        <label className="label" htmlFor="profile-logo">Logo URL</label>
        <input
          id="profile-logo"
          name="logoUrl"
          className="input"
          defaultValue={initial.logoUrl ?? ''}
          placeholder="https://example.edu.et/logo.png"
        />
        <p className="mt-1 text-xs text-slate-500">
          Hosted by your organisation — this is a URL, not an upload. It appears on printed labels, emails and your
          public status page.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="profile-brand">Brand colour</label>
        <div className="flex items-center gap-2">
          <input
            id="profile-brand"
            className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
            type="color"
            value={colour}
            onChange={(event) => setColour(event.target.value)}
          />
          <span className="font-mono text-xs text-slate-600">{colour}</span>
          {initial.brandPrimary ? (
            <button type="button" className="text-xs text-slate-500 hover:text-red-700" onClick={() => setColour(DEFAULT_BRAND)}>
              reset
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Used for buttons, headings and the banner on your public pages. Every other shade is derived from it.
        </p>
      </div>

      <button className="btn-secondary btn-sm" disabled={state.pending}>
        {state.pending ? <Spinner label="Saving…" /> : 'Save profile'}
      </button>
    </form>
  );
}
