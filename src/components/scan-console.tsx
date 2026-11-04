'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Card, Spinner } from './ui';
import { apiPost } from '@/lib/client/api';
import {
  clearOutbox,
  enqueueScan,
  listOutbox,
  loadManifest,
  newClientId,
  outboxCount,
  saveManifest,
  type ManifestRow,
} from '@/lib/offline/cache';
import type { ScanResult } from '@/lib/types';

type Checkpoint = { id: string; name: string };

type VerifyResponse = {
  result: ScanResult;
  tone: 'ok' | 'info' | 'warn' | 'danger';
  headline: string;
  detail: string;
  action: string;
  carrierUnverified: boolean;
  scanId: string;
  token: string;
  product: { label: string; color: string | null; status: string; serialLast4: string | null } | null;
  owner: { name: string; studentId: string | null } | null;
  missingReport: { category: string; reportedAt: string; lastKnownLocation: string | null } | null;
  checkpoint: string | null;
  scannedAt: string;
};

type CachedResult = {
  result: ScanResult;
  tone: 'ok' | 'info' | 'warn' | 'danger';
  headline: string;
  detail: string;
  action: string;
  carrierUnverified: boolean;
  source: 'cache';
  token: string;
  product: { label: string; color: string | null; status: string; serialLast4: string | null } | null;
  owner: { name: string | null; studentId: string | null } | null;
  missingReport: null;
  checkpoint: string | null;
  scannedAt: string;
};

type LocalResult = (VerifyResponse & { source: 'live' }) | CachedResult;

const TONE_STYLES: Record<string, string> = {
  ok: 'border-emerald-300 bg-emerald-50',
  warn: 'border-amber-300 bg-amber-50',
  danger: 'border-red-300 bg-red-50',
  info: 'border-sky-300 bg-sky-50',
};

export function ScanConsole({ checkpoints }: { checkpoints: Checkpoint[] }) {
  const [checkpointId, setCheckpointId] = useState(checkpoints[0]?.id ?? '');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<LocalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [carrierId, setCarrierId] = useState('');
  const [carrierIdShown, setCarrierIdShown] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [online, setOnline] = useState(true);
  const [cacheMeta, setCacheMeta] = useState<{ count: number; generatedAt: string; expiresAt: string } | null>(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const readerId = 'campusguard-reader';
  const startedAt = useRef<number>(0);

  const refreshCacheState = useCallback(async () => {
    const cached = await loadManifest();
    setCacheMeta(
      cached?.meta
        ? { count: cached.meta.count, generatedAt: cached.meta.generatedAt, expiresAt: cached.meta.expiresAt }
        : null,
    );
    setPending(await outboxCount());
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void refreshCacheState();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refreshCacheState]);

  useEffect(() => {
    setCameraAvailable(typeof navigator !== 'undefined' && 'mediaDevices' in navigator && window.isSecureContext);
  }, []);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  // --- resolution ----------------------------------------------------------

  const resolveLocally = useCallback(
    async (token: string): Promise<CachedResult | null> => {
    const cached = await loadManifest();
    if (!cached) return null;
    const row = cached.rows.find((r) => r.token === token) as ManifestRow | undefined;
    if (!row) {
      return {
        result: 'NOT_REGISTERED',
        tone: 'warn',
        headline: 'Not in the offline cache',
        detail:
          'This device is not in the cached registry. It may be registered but added after your last sync, or not registered at all.',
        action: 'Absence of registration is not evidence of wrongdoing. Note the scan and allow the student through.',
        carrierUnverified: true,
        source: 'cache',
        token,
        product: null,
        owner: null,
        missingReport: null,
        checkpoint: checkpoints.find((c) => c.id === checkpointId)?.name ?? null,
        scannedAt: new Date().toISOString(),
      };
    }
    const flagged = row.flagged || row.status === 'REPORTED_MISSING';
    return {
      result: flagged ? 'ACTIVE_MISSING_REPORT' : 'REGISTERED_OK',
      tone: flagged ? 'danger' : 'ok',
      headline: flagged ? 'Reported missing (cached)' : 'Registered — no active reports (cached)',
      detail: `${row.label}${row.owner ? ` · registered to ${row.owner}` : ''}`,
      action: flagged
        ? 'Do not detain or accuse. Record the encounter and refer to your supervisor. This result came from cached data and will be confirmed on sync.'
        : 'Cached result — the authoritative record is written when the device reconnects.',
      carrierUnverified: true,
      source: 'cache',
      token,
      product: { label: row.label, color: null, status: row.status, serialLast4: null },
      owner: { name: row.owner, studentId: null },
      missingReport: null,
      checkpoint: checkpoints.find((c) => c.id === checkpointId)?.name ?? null,
      scannedAt: new Date().toISOString(),
      };
    },
    [checkpointId, checkpoints],
  );

  const handleToken = useCallback(
    async (rawToken: string) => {
      setError(null);
      startedAt.current = Date.now();

      if (!navigator.onLine) {
        const local = await resolveLocally(rawToken);
        if (local) {
          setResult(local);
          setLastDuration(Date.now() - startedAt.current);
          await enqueueScan({
            clientId: newClientId(),
            token: rawToken,
            scannedAt: new Date().toISOString(),
            carrierIdentifier: carrierId || undefined,
            carrierIdShown,
            cachedResult: local.result,
            checkpointId: checkpointId || undefined,
          });
          setPending(await outboxCount());
          return;
        }
        setError('No cached registry on this device. Connect to the network once to download it.');
        return;
      }

      try {
        const data = await apiPost<VerifyResponse>('/api/scan/verify', {
          token: rawToken,
          checkpointId: checkpointId || undefined,
          carrierIdentifier: carrierId || undefined,
          carrierIdShown,
          durationMs: Date.now() - startedAt.current || undefined,
        });
        setResult({ ...data, source: 'live' });
        setLastDuration(Date.now() - startedAt.current);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [carrierId, carrierIdShown, checkpointId, resolveLocally],
  );

  // --- camera --------------------------------------------------------------

  async function startScanner() {
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(readerId);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void scanner.stop().catch(() => {});
          setScanning(false);
          void handleToken(decoded);
        },
        () => {
          // Per-frame decode misses are normal; ignore them.
        },
      );
    } catch (err) {
      setScanning(false);
      setError(
        'Could not start the camera. Check that the browser has camera permission, or use “scan from image” or manual entry below.',
      );
      console.warn(err);
    }
  }

  async function stopScanner() {
    await scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  }

  async function scanFromFile(file: File) {
    setError(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(readerId, { verbose: false });
      const decoded = await scanner.scanFile(file, false);
      await handleToken(decoded);
    } catch {
      setError('Could not read a CampusGuard code from that image.');
    }
  }

  // --- offline sync --------------------------------------------------------

  async function downloadCache() {
    setError(null);
    try {
      const response = await fetch('/api/scan/manifest');
      const data = (await response.json()) as {
        rows: ManifestRow[];
        generatedAt: string;
        expiresAt: string;
        count: number;
        truncated: boolean;
      };
      await saveManifest(data.rows, {
        generatedAt: data.generatedAt,
        expiresAt: data.expiresAt,
        count: data.count,
        truncated: data.truncated,
      });
      await refreshCacheState();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function syncOutbox() {
    setSyncing(true);
    setError(null);
    try {
      const items = await listOutbox();
      if (!items.length) {
        setSyncing(false);
        return;
      }
      await apiPost('/api/scan/sync', {
        batchId: `batch-${Date.now()}`,
        checkpointId: checkpointId || undefined,
        scans: items,
      });
      await clearOutbox(items.map((i) => i.clientId));
      await refreshCacheState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <div className="border-b border-slate-100 p-4">
            <label className="label" htmlFor="checkpoint">
              Checkpoint
            </label>
            <select
              id="checkpoint"
              className="select"
              value={checkpointId}
              onChange={(e) => setCheckpointId(e.target.value)}
            >
              <option value="">No checkpoint selected</option>
              {checkpoints.map((checkpoint) => (
                <option key={checkpoint.id} value={checkpoint.id}>
                  {checkpoint.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4">
            <div id={readerId} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-slate-900" />

            <div className="mt-3 flex flex-wrap gap-2">
              {scanning ? (
                <button onClick={stopScanner} className="btn-secondary">
                  Stop camera
                </button>
              ) : (
                <button onClick={startScanner} className="btn-primary" disabled={cameraAvailable === false}>
                  Start camera scan
                </button>
              )}
              <label className="btn-secondary cursor-pointer">
                Scan from image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void scanFromFile(file);
                  }}
                />
              </label>
            </div>

            {cameraAvailable === false ? (
              <p className="mt-2 text-xs text-slate-500">
                The camera is unavailable here (it needs a secure https connection and browser permission). Use “scan from
                image” or type the code below — both produce an identical record.
              </p>
            ) : null}

            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (manualCode.trim()) void handleToken(manualCode.trim());
              }}
            >
              <div className="sm:col-span-2">
                <label className="label" htmlFor="manual">
                  Enter the code by hand
                </label>
                <div className="flex gap-2">
                  <input
                    id="manual"
                    className="input font-mono"
                    placeholder="CG-XXXXXXXXXXXXXXXXXXXX"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value)}
                  />
                  <button className="btn-secondary whitespace-nowrap">Verify</button>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="carrier">
                  Carrier’s university ID <span className="font-normal text-slate-400">(only after an ID check)</span>
                </label>
                <input
                  id="carrier"
                  className="input"
                  placeholder="UGR/1234/15 or email"
                  value={carrierId}
                  onChange={(event) => setCarrierId(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={carrierIdShown}
                    onChange={(event) => setCarrierIdShown(event.target.checked)}
                  />
                  I checked a university ID card
                </label>
              </div>
            </form>

            {error ? (
              <div className="mt-3">
                <Alert tone="danger">{error}</Alert>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <Card className="card-pad">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Connection</h2>
            <Badge tone={online ? 'ok' : 'warn'}>{online ? 'Online' : 'Offline'}</Badge>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {cacheMeta
              ? `Cached registry: ${cacheMeta.count} devices, downloaded ${new Date(cacheMeta.generatedAt).toLocaleString('en-ET')}.`
              : 'No offline cache on this device yet.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={downloadCache} disabled={!online} className="btn-secondary btn-sm">
              Download offline cache
            </button>
            <button onClick={syncOutbox} disabled={!online || syncing || pending === 0} className="btn-secondary btn-sm">
              {syncing ? <Spinner label="Syncing…" /> : `Upload queued scans (${pending})`}
            </button>
          </div>
          {pending > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              {pending} scan{pending === 1 ? '' : 's'} captured offline and waiting to upload. They are encrypted on this
              device until then.
            </p>
          ) : null}
        </Card>

        {result ? (
          <Card className={`border-2 ${TONE_STYLES[result.tone] ?? 'border-slate-200 bg-white'}`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{result.headline}</h2>
                <Badge tone={result.source === 'cache' ? 'warn' : 'info'}>
                  {result.source === 'cache' ? 'Cached' : 'Live'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-700">{result.detail}</p>

              <dl className="mt-3 space-y-1 text-sm">
                {result.product ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Device</dt>
                    <dd className="font-medium text-slate-800">
                      {result.product.label}
                      {result.product.serialLast4 ? (
                        <span className="ml-1 font-mono text-xs text-slate-500">··{result.product.serialLast4}</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {result.owner ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Owner</dt>
                    <dd className="text-slate-800">
                      {result.owner.name}
                      {result.owner.studentId ? (
                        <span className="ml-1 text-xs text-slate-500">({result.owner.studentId})</span>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
                {result.missingReport ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Report</dt>
                    <dd className="text-slate-800">
                      {result.missingReport.category.toLowerCase()} ·{' '}
                      {new Date(result.missingReport.reportedAt).toLocaleString('en-ET')}
                      {result.missingReport.lastKnownLocation ? ` · ${result.missingReport.lastKnownLocation}` : ''}
                    </dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-slate-500">Checkpoint</dt>
                  <dd className="text-slate-800">{result.checkpoint ?? 'Not specified'}</dd>
                </div>
                {lastDuration ? (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Scan time</dt>
                    <dd className="text-slate-800">{(lastDuration / 1000).toFixed(1)} s</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 rounded-lg bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What to do</p>
                <p className="mt-1 text-sm text-slate-800">{result.action}</p>
              </div>

              {result.carrierUnverified ? (
                <p className="mt-2 text-xs text-slate-500">
                  Carrier identity was not checked — no name was recorded against this scan.
                </p>
              ) : null}

              <button onClick={() => setResult(null)} className="btn-secondary btn-sm mt-4">
                Clear result
              </button>
            </div>
          </Card>
        ) : (
          <Card className="card-pad">
            <p className="text-sm text-slate-600">
              Scan a CampusGuard label to see its registration status. Results are a prompt for a conversation, never a
              verdict: no student may be detained, searched or have property confiscated because of what appears here.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
