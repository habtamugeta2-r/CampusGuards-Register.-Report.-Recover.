# Offline operation

University connectivity in Ethiopia is inconsistent. A scanning tool that stops working when the
network does will be switched off permanently the first time it fails during a busy hour.

## 1. What works offline, and what does not

| Capability | Offline? | Why |
| --- | --- | --- |
| Officer scanning and verification | ✅ from the local cache | The whole point |
| Recording scan events | ✅ queued, uploaded later | Never lose an encounter |
| Student registration and reporting | ❌ | Not time-critical; do it on a connection |
| Administrator dashboards | ❌ | Not performed at a gate |
| Public QR status page | ❌ | Needs the live registry |

## 2. Architecture

```
Officer device
├── Service worker (public/sw.js)
│     ├── precaches the app shell so the console opens with no network
│     ├── cache-first for hashed static assets
│     └── NEVER caches /api/* — a shared device must not serve one officer's data to the next
│
└── IndexedDB (campusguard-offline)
      ├── manifest  → the registry snapshot, ENCRYPTED (AES-GCM, non-extractable key)
      ├── outbox    → scans captured offline, ENCRYPTED, awaiting upload
      └── meta      → the CryptoKey itself, non-extractable
```

## 3. The cache

`GET /api/scan/manifest` returns, for the officer's institution:

```json
{ "token": "CG-…", "status": "ACTIVE", "label": "LAPTOP Lenovo ThinkPad E14",
  "owner": "Abel Tesfaye", "owner_id": "usr_…", "flagged": false }
```

- Capped at 20,000 rows (`OFFLINE_CACHE_MAX_ROWS`) and refreshed at least every 12 hours
  (`OFFLINE_CACHE_TTL_HOURS`).
- Downloading it is an audited action (`offline.manifest_download`).
- **No serial numbers, no emails, no phone numbers.** The cache is enough to verify a device and
  nothing more.

## 4. Encryption, and why it is worth the complexity

The cache sits on a phone that can be lost or stolen. Plaintext IndexedDB would turn a lost handset
into a registry breach. So:

1. On first use the browser generates a 256-bit AES-GCM key with `extractable: false`.
2. The key is stored in IndexedDB. Because it is non-extractable, the browser will use it but will
   never hand over the key material — not to JavaScript, not to a forensic tool that can read files.
3. Manifest rows and outbox items are encrypted with a fresh random IV before being written.
4. If the key is missing or the data is corrupt, the app treats it as "no cache" and asks the officer
   to reconnect — it never shows a misleading result.

This is not unbreakable (an attacker with the unlocked device can read what the app can read), but
it removes the whole-database-on-a-stolen-phone failure mode at a cost of about 60 lines of code.

## 5. Offline results are labelled, always

A scan resolved from the cache is shown with a **"Cached"** badge and wording that says the
authoritative record is written on reconnect. On upload, the server **re-resolves every scan against
live data** and stores it with `source = OFFLINE_CACHE`, recording what the officer saw *and* what
was true. Reports and exports always distinguish cached from live results.

If the cached result and the server result disagree, the server wins in the record and the
discrepancy is visible in `/admin/scans` — which is itself a useful measure of staleness.

## 6. Camera fallbacks

Not every environment permits camera access (an iframe without the `camera` permission, a locked-down
managed browser, a broken camera). Three paths produce an identical record:

1. **Camera** — `html5-qrcode`, decoding in the browser; no image is uploaded.
2. **Image upload** — decode a photo of the label from the device.
3. **Manual entry** — type the code printed under the QR, which is why the token is printed on the
   label in human-readable form.

Option 3 is also the fallback for a faded or torn sticker, which is the most common real-world
failure of any QR system.

## 7. Failure modes handled

| Failure | Behaviour |
| --- | --- |
| No cache and no network | Clear message: connect once to download the registry |
| Cache expired | Still usable, flagged stale, refresh prompt |
| Upload fails mid-batch | Batch is retried; already-synced items are removed so nothing duplicates |
| One unreadable code in a batch | Recorded as an error; the rest of the batch still uploads |
| Storage quota exceeded | The console surfaces it rather than silently failing to queue |
| Key lost / data corrupt | Treated as no cache; never a misleading result |
