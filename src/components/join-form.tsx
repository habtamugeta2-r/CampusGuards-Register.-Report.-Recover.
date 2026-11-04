'use client';

import { useState } from 'react';
import { Alert, Card, CardHeader, Spinner } from '@/components/ui';
import { INSTITUTION_KINDS, INSTITUTION_KIND_LABEL } from '@/lib/constants';

type Feedback = { pending?: boolean; error?: string; notice?: string };

/**
 * Public application to put an organisation on the platform.
 *
 * This is the growth path: a university, college or company applies, a platform
 * operator reviews it, and the tenant is provisioned with its own domains and
 * its first administrator. Nothing is created automatically — a tenant is a
 * data-protection commitment, not a sign-up.
 */
export function JoinForm() {
  const [state, setState] = useState<Feedback>({});

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          const response = await fetch('/api/platform/requests', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              organisationName: form.get('organisationName'),
              kind: form.get('kind'),
              country: form.get('country') || 'Ethiopia',
              city: form.get('city') || null,
              contactName: form.get('contactName'),
              contactEmail: form.get('contactEmail'),
              primaryDomain: form.get('primaryDomain'),
              extraDomains: String(form.get('extraDomains') ?? '')
                .split(/[\s,]+/)
                .map((d) => d.trim())
                .filter(Boolean),
              estimatedPeople: form.get('estimatedPeople') ? Number(form.get('estimatedPeople')) : null,
              message: form.get('message') || null,
            }),
          });
          const data = (await response.json()) as { error?: string; message?: string };
          if (!response.ok) throw new Error(data.error ?? 'Application failed.');
          setState({ pending: false, notice: data.message ?? 'Application received.' });
          event.currentTarget.reset();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger" live="assertive">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok" live="polite">{state.notice}</Alert> : null}

      <div className="sm:col-span-2">
        <label className="label" htmlFor="join-name">Organisation name</label>
        <input id="join-name" name="organisationName" required className="input" placeholder="Bahir Dar University" />
      </div>

      <div>
        <label className="label" htmlFor="join-kind">Type of organisation</label>
        <select id="join-kind" name="kind" className="select" defaultValue="UNIVERSITY">
          {INSTITUTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {INSTITUTION_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="join-domain">Main email domain</label>
        <input
          id="join-domain"
          name="primaryDomain"
          required
          className="input"
          placeholder="bdu.edu.et"
          aria-describedby="join-domain-help"
        />
        <p id="join-domain-help" className="mt-1 text-xs text-slate-500">
          Staff and students register using an address on this domain.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="join-extra">
          Other domains you use <span className="font-normal text-slate-500">(optional, comma separated)</span>
        </label>
        <input id="join-extra" name="extraDomains" className="input" placeholder="bdu.et, bdu.edu" />
      </div>

      <div>
        <label className="label" htmlFor="join-contact">Your name</label>
        <input id="join-contact" name="contactName" required className="input" />
      </div>

      <div>
        <label className="label" htmlFor="join-email">Your email</label>
        <input id="join-email" name="contactEmail" type="email" required className="input" />
      </div>

      <div>
        <label className="label" htmlFor="join-country">Country</label>
        <input id="join-country" name="country" className="input" defaultValue="Ethiopia" />
      </div>

      <div>
        <label className="label" htmlFor="join-city">City</label>
        <input id="join-city" name="city" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="join-people">
          How many people? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input id="join-people" name="estimatedPeople" type="number" min={1} className="input" placeholder="18000" />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="join-message">
          Anything else? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea id="join-message" name="message" rows={3} className="input" />
      </div>

      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={state.pending}>
          {state.pending ? <Spinner label="Sending…" /> : 'Apply to join'}
        </button>
      </div>
    </form>
  );
}

export function JoinCard() {
  return (
    <Card>
      <CardHeader title="Apply to join" subtitle="Reviewed by a person, not by a script." />
      <div className="px-4 py-4 sm:px-6">
        <JoinForm />
      </div>
    </Card>
  );
}
