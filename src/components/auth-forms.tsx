'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Spinner } from './ui';
import { roleHome } from '@/lib/role-home';

type State = { error?: string; issues?: Array<{ path: string; message: string }>; pending: boolean };

export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ pending: false });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState({ pending: true });

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState({ pending: false, error: data.error ?? 'Could not sign in.' });
      return;
    }
    router.push(roleHome(data.role));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div>
        <label className="label" htmlFor="email">
          University email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@aastu.edu.et" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <button type="submit" disabled={state.pending} className="btn-primary w-full">
        {state.pending ? <Spinner label="Signing in…" /> : 'Sign in'}
      </button>
      <p className="text-center text-sm text-slate-500">
        No account?{' '}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Register with your university email
        </Link>
      </p>
    </form>
  );
}

const CONSENTS = [
  {
    id: 'TERMS_OF_USE',
    label: 'I accept the terms of use.',
    required: true,
  },
  {
    id: 'PRIVACY_NOTICE',
    label: 'I have read the privacy notice and understand what data CampusGuard stores and who can see it.',
    required: true,
  },
  {
    id: 'PILOT_PARTICIPATION',
    label: 'I understand registration is voluntary and that I can withdraw and request deletion at any time.',
    required: true,
  },
  {
    id: 'DATA_PROCESSING',
    label: 'I agree that campus security may see my registration status when my device is scanned at a checkpoint.',
    required: false,
  },
];

export function RegisterForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ pending: false });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const consents = CONSENTS.filter((c) => form.get(`consent_${c.id}`) === 'on').map((c) => c.id);

    const missing = CONSENTS.filter((c) => c.required && !consents.includes(c.id));
    if (missing.length) {
      setState({ pending: false, error: 'Please accept the required agreements to continue.' });
      return;
    }

    setState({ pending: true });
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: form.get('fullName'),
        email: form.get('email'),
        password: form.get('password'),
        studentId: form.get('studentId'),
        department: form.get('department'),
        phone: form.get('phone'),
        consents,
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setState({ pending: false, error: data.error ?? 'Could not create your account.', issues: data.issues });
      return;
    }
    router.push('/student');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.error ? (
        <Alert tone="danger">
          {state.error}
          {state.issues?.length ? (
            <ul className="mt-1 list-inside list-disc">
              {state.issues.map((issue) => (
                <li key={issue.path}>{issue.message}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            University email
          </label>
          <input id="email" name="email" type="email" required className="input" placeholder="you@aastu.edu.et" autoComplete="email" />
          <p className="mt-1 text-xs text-slate-500">Only email domains registered with your university are accepted.</p>
        </div>
        <div>
          <label className="label" htmlFor="studentId">
            University ID number
          </label>
          <input id="studentId" name="studentId" required className="input" placeholder="e.g. UGR/1234/15" />
        </div>
        <div>
          <label className="label" htmlFor="department">
            Department <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="department" name="department" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone <span className="font-normal text-slate-400">(optional — used only to contact you about a found device)</span>
          </label>
          <input id="phone" name="phone" className="input" autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" required minLength={10} className="input" autoComplete="new-password" />
          <p className="mt-1 text-xs text-slate-500">At least 10 characters. A short phrase you can remember works well.</p>
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Consent</legend>
        {CONSENTS.map((consent) => (
          <label key={consent.id} className="flex gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={`consent_${consent.id}`}
              required={consent.required}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            <span>{consent.label}</span>
          </label>
        ))}
      </fieldset>

      <button type="submit" disabled={state.pending} className="btn-primary w-full">
        {state.pending ? <Spinner label="Creating account…" /> : 'Create account'}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
