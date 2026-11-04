'use client';

/**
 * Encrypted offline registry cache for the security scanning interface.
 *
 * Why encrypt at all? The cache holds the device registry for a whole campus on
 * a phone that can be lost or stolen. Storing it in plaintext IndexedDB would
 * turn a lost handset into a data breach, so entries are encrypted with a
 * non-extractable AES-GCM key held by the browser's own key store: the data can
 * be decrypted on this device, but the key material cannot be exported.
 */

const DB_NAME = 'campusguard-offline';
const DB_VERSION = 1;
const STORE_MANIFEST = 'manifest';
const STORE_OUTBOX = 'outbox';
const STORE_META = 'meta';

export type ManifestRow = {
  token: string;
  status: string;
  label: string;
  owner: string;
  owner_id: string;
  flagged: boolean;
};

export type OutboxItem = {
  clientId: string;
  token: string;
  scannedAt: string;
  carrierIdentifier?: string;
  carrierIdShown?: boolean;
  note?: string;
  durationMs?: number;
  cachedResult?: string;
  checkpointId?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MANIFEST)) db.createObjectStore(STORE_MANIFEST, { keyPath: 'token' });
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) db.createObjectStore(STORE_OUTBOX, { keyPath: 'clientId' });
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = fn(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

// --- encryption -------------------------------------------------------------

const KEY_ALIAS = 'registry-cache-key';

async function getKey(): Promise<CryptoKey> {
  const raw = await tx<CryptoKey | undefined>(STORE_META, 'readonly', (s) => s.get(KEY_ALIAS) as IDBRequest<CryptoKey | undefined>);
  if (raw) return raw;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await tx(STORE_META, 'readwrite', (s) => s.put(key, KEY_ALIAS) as IDBRequest<IDBValidKey>);
  return key;
}

async function encrypt(rows: ManifestRow[]): Promise<{ iv: string; payload: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(rows));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: Array.from(iv).join(','), payload: Array.from(new Uint8Array(cipher)).join(',') };
}

async function decrypt(iv: string, payload: string): Promise<ManifestRow[]> {
  const key = await getKey();
  const bytes = new Uint8Array(payload.split(',').map(Number));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv.split(',').map(Number)) },
    key,
    bytes,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as ManifestRow[];
}

// --- manifest ---------------------------------------------------------------

export type ManifestMeta = { generatedAt: string; expiresAt: string; count: number; truncated: boolean };

export async function saveManifest(rows: ManifestRow[], meta: ManifestMeta): Promise<void> {
  const { iv, payload } = await encrypt(rows);
  await tx(STORE_MANIFEST, 'readwrite', (s) =>
    s.put({ token: '__manifest__', iv, payload, meta }) as IDBRequest<IDBValidKey>,
  );
}

export async function loadManifest(): Promise<{ rows: ManifestRow[]; meta: ManifestMeta | null } | null> {
  const record = await tx<{ iv: string; payload: string; meta: ManifestMeta } | undefined>(
    STORE_MANIFEST,
    'readonly',
    (s) => s.get('__manifest__') as IDBRequest<{ iv: string; payload: string; meta: ManifestMeta } | undefined>,
  );
  if (!record) return null;
  try {
    return { rows: await decrypt(record.iv, record.payload), meta: record.meta };
  } catch {
    // Key rotated or data corrupt: treat as no cache rather than crashing.
    return null;
  }
}

export async function clearManifest(): Promise<void> {
  await tx(STORE_MANIFEST, 'readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
}

// --- outbox -----------------------------------------------------------------

export async function enqueueScan(item: OutboxItem): Promise<void> {
  await tx(STORE_OUTBOX, 'readwrite', (s) => s.put(item) as IDBRequest<IDBValidKey>);
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return (await tx<OutboxItem[]>(STORE_OUTBOX, 'readonly', (s) => s.getAll() as IDBRequest<OutboxItem[]>)) ?? [];
}

export async function clearOutbox(clientIds?: string[]): Promise<void> {
  if (!clientIds) {
    await tx(STORE_OUTBOX, 'readwrite', (s) => s.clear() as unknown as IDBRequest<undefined>);
    return;
  }
  for (const clientId of clientIds) {
    await tx(STORE_OUTBOX, 'readwrite', (s) => s.delete(clientId) as unknown as IDBRequest<undefined>);
  }
}

export async function outboxCount(): Promise<number> {
  return (await tx<number>(STORE_OUTBOX, 'readonly', (s) => s.count() as IDBRequest<number>)) ?? 0;
}

export function newClientId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
