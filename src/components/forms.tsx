'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Spinner } from './ui';
import { apiDelete, apiPatch, apiPost } from '@/lib/client/api';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABEL } from '@/lib/constants';
import type { ProductType } from '@/lib/types';

type Feedback = { error?: string; pending: boolean; notice?: string };

const CATEGORY_LABEL: Record<string, string> = {
  LOST: 'Lost — I do not know how it went missing',
  STOLEN: 'Stolen — I believe someone took it',
  MISPLACED: 'Misplaced — it is probably still on campus',
  CONFISCATED: 'Confiscated by the university',
};

export function ProductForm({ product, onDone }: { product?: Record<string, unknown>; onDone?: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ pending: true });

    const payload = {
      type: form.get('type'),
      brand: form.get('brand'),
      model: form.get('model'),
      serialNumber: form.get('serialNumber'),
      color: form.get('color'),
      distinguishingMarks: form.get('distinguishingMarks'),
      notes: form.get('notes'),
    };

    try {
      if (product?.id) await apiPatch(`/api/products/${product.id}`, snakeCase(payload));
      else await apiPost('/api/products', payload);
      setState({ pending: false, notice: 'Saved.' });
      router.refresh();
      onDone?.();
    } catch (error) {
      setState({ pending: false, error: (error as Error).message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="type">
            What is it?
          </label>
          <select id="type" name="type" className="select" defaultValue={(product?.type as string) ?? 'LAPTOP'}>
            {PRODUCT_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRODUCT_TYPE_LABEL[type as ProductType]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="brand">
            Brand
          </label>
          <input id="brand" name="brand" required className="input" defaultValue={(product?.brand as string) ?? ''} placeholder="Lenovo" />
        </div>
        <div>
          <label className="label" htmlFor="model">
            Model
          </label>
          <input id="model" name="model" required className="input" defaultValue={(product?.model as string) ?? ''} placeholder="ThinkPad E14" />
        </div>
        <div>
          <label className="label" htmlFor="serialNumber">
            Serial number <span className="font-normal text-slate-400">(optional, but it helps)</span>
          </label>
          <input id="serialNumber" name="serialNumber" className="input" defaultValue={(product?.serialNumber as string) ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="color">
            Colour <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="color" name="color" className="input" defaultValue={(product?.color as string) ?? ''} />
        </div>
        <div>
          <label className="label" htmlFor="distinguishingMarks">
            Distinguishing marks <span className="font-normal text-slate-400">(scratches, stickers)</span>
          </label>
          <input
            id="distinguishingMarks"
            name="distinguishingMarks"
            className="input"
            defaultValue={(product?.distinguishingMarks as string) ?? ''}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            Notes <span className="font-normal text-slate-400">(optional, private to you and the lost-property desk)</span>
          </label>
          <input id="notes" name="notes" className="input" defaultValue={(product?.notes as string) ?? ''} />
        </div>
      </div>

      <button type="submit" disabled={state.pending} className="btn-primary">
        {state.pending ? <Spinner label="Saving…" /> : product?.id ? 'Save changes' : 'Register device'}
      </button>
    </form>
  );
}

function snakeCase(input: Record<string, unknown>) {
  const map: Record<string, string> = {
    serialNumber: 'serial_number',
    distinguishingMarks: 'distinguishing_marks',
  };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) out[map[key] ?? key] = value;
  return out;
}

export function MissingReportForm({
  products,
  defaultProductId,
}: {
  products: Array<{ id: string; label: string; status: string }>;
  defaultProductId?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  const available = products.filter((p) => p.status !== 'RETIRED');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ pending: true });
    try {
      await apiPost('/api/reports/missing', {
        productId: form.get('productId'),
        category: form.get('category'),
        description: form.get('description'),
        lastKnownLocation: form.get('lastKnownLocation'),
        occurredAt: form.get('occurredAt') ? new Date(String(form.get('occurredAt'))).toISOString() : undefined,
        channel: 'CAMPUSGUARD',
      });
      setState({ pending: false, notice: 'Report filed.' });
      router.push('/student/reports');
      router.refresh();
    } catch (error) {
      setState({ pending: false, error: (error as Error).message });
    }
  }

  if (!available.length) {
    return <Alert tone="warn">Register a device before reporting it missing.</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <label className="label" htmlFor="productId">
          Which device?
        </label>
        <select id="productId" name="productId" className="select" defaultValue={defaultProductId ?? available[0]?.id}>
          {available.map((product) => (
            <option key={product.id} value={product.id}>
              {product.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="category">
          What happened?
        </label>
        <select id="category" name="category" className="select" defaultValue="LOST">
          {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lastKnownLocation">
            Where did you last have it?
          </label>
          <input id="lastKnownLocation" name="lastKnownLocation" className="input" placeholder="Main Library, 2nd floor, desk 14" />
        </div>
        <div>
          <label className="label" htmlFor="occurredAt">
            When was that? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="occurredAt" name="occurredAt" type="datetime-local" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">
          Anything else? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} className="input" />
      </div>
      <button type="submit" disabled={state.pending} className="btn-primary">
        {state.pending ? <Spinner label="Filing…" /> : 'File report'}
      </button>
      <p className="text-xs text-slate-500">
        Filing a false report is a disciplinary matter under university rules. If you find the device, withdraw the report
        so the registry stays accurate.
      </p>
    </form>
  );
}

export function BorrowForm({ productId, productLabel }: { productId: string; productLabel: string }) {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ pending: true });
    try {
      await apiPost('/api/authorizations', {
        productId,
        borrowerIdentifier: form.get('borrowerIdentifier'),
        endsAt: new Date(String(form.get('endsAt'))).toISOString(),
        reason: form.get('reason'),
      });
      setState({ pending: false, notice: 'Authorised.' });
      router.refresh();
    } catch (error) {
      setState({ pending: false, error: (error as Error).message });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok">{state.notice}</Alert> : null}
      <p className="text-sm text-slate-600">
        Authorise someone to carry your {productLabel}. If an officer scans it while the authorisation is valid, they will
        see the borrower is authorised instead of an alert.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="borrowerIdentifier">
            Borrower’s university ID or email
          </label>
          <input id="borrowerIdentifier" name="borrowerIdentifier" required className="input" placeholder="UGR/4477/15" />
        </div>
        <div>
          <label className="label" htmlFor="endsAt">
            Until
          </label>
          <input id="endsAt" name="endsAt" type="datetime-local" required className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="reason">
            Reason <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="reason" name="reason" className="input" placeholder="Group project presentation" />
        </div>
      </div>
      <button type="submit" disabled={state.pending} className="btn-secondary btn-sm">
        {state.pending ? <Spinner label="Saving…" /> : 'Authorise borrower'}
      </button>
    </form>
  );
}

export function RevokeAuthorizationButton({ authorizationId }: { authorizationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-danger btn-sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await apiDelete(`/api/authorizations/${authorizationId}`);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Revoking…' : 'Revoke'}
    </button>
  );
}

export function RetireProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-danger btn-sm"
      disabled={pending}
      onClick={async () => {
        const reason = window.prompt('Why are you removing this device? (e.g. sold, given away, broken)');
        if (reason === null) return;
        setPending(true);
        try {
          await apiDelete(`/api/products/${productId}?reason=${encodeURIComponent(reason || 'Removed by owner')}`);
          router.push('/student/products');
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Removing…' : 'Remove from registry'}
    </button>
  );
}

export function RotateQrButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        className="btn-secondary btn-sm"
        disabled={pending}
        onClick={async () => {
          const reason = window.prompt('Why do you need a new label? (e.g. sticker damaged, label removed)');
          if (reason === null) return;
          setPending(true);
          setError(null);
          try {
            await apiPost(`/api/products/${productId}/qr`, { reason: reason || 'Label replaced' });
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Issuing…' : 'Issue replacement label'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, setState] = useState<Feedback>({ pending: false });

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPost('/api/me/password', {
            currentPassword: form.get('currentPassword'),
            newPassword: form.get('newPassword'),
          });
          setState({ pending: false, notice: 'Password changed. Other devices were signed out.' });
          event.currentTarget.reset();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok">{state.notice}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="currentPassword" type="password" required className="input" placeholder="Current password" />
        <input name="newPassword" type="password" required minLength={10} className="input" placeholder="New password (10+ characters)" />
      </div>
      <button className="btn-secondary btn-sm" disabled={state.pending}>
        {state.pending ? <Spinner label="Updating…" /> : 'Change password'}
      </button>
    </form>
  );
}

export function DataRequestForm() {
  const router = useRouter();
  const [state, setState] = useState<Feedback>({ pending: false });

  const kinds = [
    ['ACCESS', 'Access — tell me what you hold about me'],
    ['CORRECTION', 'Correction — something is wrong'],
    ['DELETION', 'Deletion — remove my account and data'],
    ['OBJECTION', 'Objection — I object to a specific use'],
  ];

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          await apiPost('/api/me/requests', { kind: form.get('kind'), details: form.get('details') });
          setState({ pending: false, notice: 'Request submitted. The university data controller will respond.' });
          router.refresh();
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.notice ? <Alert tone="ok">{state.notice}</Alert> : null}
      <select name="kind" className="select" defaultValue="ACCESS">
        {kinds.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea name="details" rows={2} className="input" placeholder="Any details that will help us handle this" />
      <button className="btn-secondary btn-sm" disabled={state.pending}>
        {state.pending ? <Spinner label="Submitting…" /> : 'Submit request'}
      </button>
    </form>
  );
}
