# ADR-0005: QR codes carry an opaque token, never identity

- **Status:** accepted
- **Date:** 2026-01

## Context

The obvious implementation of a QR label encodes the device record, or the owner's student ID, or a
URL containing both. It is convenient: an offline scanner needs no database, and a lost device can be
identified by anyone.

It is also a privacy failure. University campuses are public places. Labels get photographed, posted
in group chats, and scanned by strangers. A code that encodes "Abel Tesfaye, UGR/4821/15, Lenovo
ThinkPad E14" turns every lost sticker into a disclosure.

## Decision

- A QR label encodes `https://<host>/s/CG-<20 chars of Crockford base32>` (≈100 bits of randomness).
- The token is meaningless without the database. It is not derived from any attribute of the student
  or device.
- The public page it points to returns device type, brand, model, colour, distinguishing marks and
  whether the device is reported missing — **and nothing about the owner**. No name, no email, no
  phone, no student ID, no serial.
- Tokens are revocable: rotating a label sets `revoked_at` on the old identifier, and it stops
  resolving everywhere at once.

## Consequences

- **Verification requires the database.** That is why the officer's offline cache exists, and why it
  is encrypted (ADR-0006).
- **Normalisation matters.** Codes are printed small and read by humans under bad lighting, so
  `normalizeToken()` accepts a full URL, lower case, whitespace, Crockford confusions (`I`/`L` → `1`,
  `O` → `0`) and a bare code without the prefix. It rejects anything it cannot confidently repair,
  rather than guessing.
- **The token is printed in human-readable form under the code**, which is the fallback for a faded
  or torn sticker — the most common real-world failure of any QR system.
- **A leaked database dump does not map codes to people on its own**, which reduces the blast radius
  of the breach we are most likely to have.
