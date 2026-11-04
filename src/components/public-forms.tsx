'use client';

import { useState } from 'react';
import { Alert, Spinner } from './ui';
import { apiPost } from '@/lib/client/api';

/**
 * The public "I found this" flow.
 *
 * Deliberately low friction — the finder is doing the university a favour, and
 * every extra field is a reason to shrug and walk away. The finder's contact
 * details are stored for the lost-property desk only.
 */
export function FoundReportForm({ token, showTokenField = true }: { token?: string; showTokenField?: boolean }) {
  const [state, setState] = useState<{ pending: boolean; error?: string; done?: boolean; message?: string }>({
    pending: false,
  });

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setState({ pending: true });
        try {
          const result = await apiPost<{ matched?: boolean; productLabel?: string | null }>('/api/reports/found', {
            token: form.get('token') ?? token,
            location: form.get('location'),
            description: form.get('description'),
            finderName: form.get('finderName'),
            finderContact: form.get('finderContact'),
          });
          setState({
            pending: false,
            done: true,
            message: result.matched
              ? 'Thank you — this device has an open missing report and the owner has been notified. Please hand it in.'
              : result.productLabel
                ? 'Thank you. The lost-property desk has been notified and will contact the owner.'
                : 'Thank you. The item has been logged with the lost-property desk.',
          });
        } catch (error) {
          setState({ pending: false, error: (error as Error).message });
        }
      }}
    >
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.done ? <Alert tone="ok">{state.message}</Alert> : null}

      {!state.done ? (
        <>
          {showTokenField ? (
            <div>
              <label className="label" htmlFor="token">
                Code on the label <span className="font-normal text-slate-400">(optional if you do not have it)</span>
              </label>
              <input
                id="token"
                name="token"
                defaultValue={token ?? ''}
                className="input font-mono"
                placeholder="CG-XXXXXXXXXXXXXXXXXXXX"
              />
            </div>
          ) : (
            <input type="hidden" name="token" value={token ?? ''} />
          )}
          <div>
            <label className="label" htmlFor="location">
              Where did you find it?
            </label>
            <input id="location" name="location" required className="input" placeholder="Main Library, 2nd floor, desk 14" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              Anything worth noting? <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea id="description" name="description" rows={2} className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="finderName">
                Your name <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="finderName" name="finderName" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="finderContact">
                Contact <span className="font-normal text-slate-400">(optional, desk use only)</span>
              </label>
              <input id="finderContact" name="finderContact" className="input" placeholder="phone or email" />
            </div>
          </div>
          <button className="btn-primary" disabled={state.pending}>
            {state.pending ? <Spinner label="Sending…" /> : 'Report it found'}
          </button>
          <p className="text-xs text-slate-500">
            We never give your contact details to the device owner. Everything goes through the lost-property desk.
          </p>
        </>
      ) : null}
    </form>
  );
}

/** Camera scanner for the public "I found a device" page. */
export function PublicScanner({ onResult }: { onResult: (token: string) => void }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('public-reader');
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          void scanner.stop().catch(() => {});
          setScanning(false);
          onResult(decoded);
        },
        () => {},
      );
    } catch {
      setScanning(false);
      setError('Could not open the camera. Type the code printed under the QR instead — it works the same way.');
    }
  }

  return (
    <div>
      <div id="public-reader" className="mx-auto w-full max-w-xs overflow-hidden rounded-lg bg-slate-900" />
      <div className="mt-2 flex flex-wrap gap-2">
        {scanning ? (
          <button className="btn-secondary btn-sm" onClick={() => window.location.reload()}>
            Stop
          </button>
        ) : (
          <button className="btn-primary btn-sm" onClick={start}>
            Scan the QR label
          </button>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}
