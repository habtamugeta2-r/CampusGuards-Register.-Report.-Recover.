'use client';

import { Card } from './ui';

/**
 * The printable QR label.
 *
 * The QR code encodes a URL to the public status page, and the public page
 * reveals no personal data. The token is printed underneath so that a faded or
 * torn sticker can still be checked by hand at a gate.
 */
export function QrLabel({
  token,
  qrDataUrl,
  device,
  owner,
  institution,
  publicUrl,
}: {
  token: string;
  qrDataUrl: string;
  device: string;
  owner: string;
  institution: string;
  publicUrl: string;
}) {
  return (
    <Card className="card-pad">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your QR label</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Print this, cut it out and stick it on the device. Laminating it, or covering it with clear tape, roughly
            doubles its life.
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-primary btn-sm no-print">
          Print
        </button>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="w-[300px] rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-700">CampusGuard</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code for ${device}`} className="mx-auto my-2 h-[200px] w-[200px]" />
          <p className="font-mono text-xs font-semibold tracking-tight text-slate-900">{token}</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-500">
            {device}
            <br />
            {institution} · if found, scan or hand in
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Registered to</dt>
          <dd className="font-medium text-slate-800">{owner}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Public status page</dt>
          <dd className="truncate text-xs text-slate-600">{publicUrl}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-500">
        Anyone who scans this code with an ordinary camera sees only whether the device is registered or reported missing.
        They never see your name, email, phone number or serial number.
      </p>
    </Card>
  );
}
