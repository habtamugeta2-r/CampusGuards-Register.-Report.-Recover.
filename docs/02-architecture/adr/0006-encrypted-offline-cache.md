# ADR-0006: Encrypt the officer's offline cache with a non-extractable key

- **Status:** accepted
- **Date:** 2026-01

## Context

For the scanning console to work without connectivity, the device must hold a copy of the registry:
every token, its status, a device description and the owner's name — for the whole campus. That is a
lot of personal data sitting in IndexedDB on a phone that a security officer carries around, and that
may be lost, stolen, or shared between shifts.

The naive implementation (plain IndexedDB) is ~60 lines simpler and turns a lost handset into a data
breach. Under Proclamation 1321/2024, a breach involving that data triggers a 72-hour notification to
the Authority and to affected individuals.

## Decision

1. On first use, generate a 256-bit AES-GCM key with `crypto.subtle.generateKey(..., false, ...)`
   — **`extractable: false`**.
2. Store the key object itself in IndexedDB. Because it is non-extractable, the browser will use it
   but will never export the key material to JavaScript or to anything reading the profile directory.
3. Encrypt manifest rows and outbox items with a fresh random IV before writing them.
4. If decryption fails for any reason, treat it as "no cache" and ask the officer to reconnect —
   never show a result derived from partially readable data.
5. Keep the payload minimal in the first place: no serial numbers, emails or phone numbers are ever
   downloaded to the device.

## Consequences

- **Not unbreakable.** An attacker with the unlocked device and the app open can read what the app
  can read. What this removes is the far more likely scenario: a lost or stolen phone being examined
  later, offline, by whoever has it.
- ~60 lines of extra client code (`src/lib/offline/cache.ts`) and no extra dependency — WebCrypto is
  built in.
- The cache cannot be pre-populated or migrated between devices; a new device re-downloads it. That
  is acceptable and arguably desirable.
- If a device is lost, the response is: revoke the officer's session, and the key goes with the
  device. Documented in the runbook.
- Older browsers without IndexedDB or WebCrypto simply fall back to online-only scanning, with the
  console showing that the offline cache is unavailable.
