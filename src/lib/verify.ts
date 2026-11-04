import type { ScanResult } from './types';

/**
 * The verification rule engine.
 *
 * This module is deliberately pure: no database, no request context. That makes
 * the single most consequential logic in CampusGuard — the decision a security
 * officer sees on their screen — unit-testable and reviewable in isolation.
 *
 * Design principle from the proposal: a CampusGuard result is INFORMATION, not a
 * VERDICT. Every outcome carries an instruction that requires human judgement;
 * none of them authorise detention or confiscation.
 */

export type VerificationSubject = {
  /** Was an active product record found for the scanned token? */
  productFound: boolean;
  retired: boolean;
  /** Denormalised product status (kept as a string to keep this module pure). */
  status: 'ACTIVE' | 'REPORTED_MISSING' | 'RECOVERED' | 'RETIRED';
  ownerId: string | null;
  ownerName: string | null;
  productLabel: string | null;
  hasActiveMissingReport: boolean;
  /** Verified identity of the person carrying the device, if checked. */
  carrierUserId: string | null;
  borrowerAuthorized: boolean;
};

export type VerificationOutcome = {
  result: ScanResult;
  tone: 'ok' | 'info' | 'warn' | 'danger';
  headline: string;
  detail: string;
  action: string;
  /** True when the carrier's identity was never established by the officer. */
  carrierUnverified: boolean;
};

const NOT_REGISTERED: VerificationOutcome = {
  result: 'NOT_REGISTERED',
  tone: 'warn',
  headline: 'Not in the registry',
  detail:
    'No CampusGuard record matches this code. Most unregistered devices are simply unregistered — registration is voluntary.',
  action:
    'Absence of registration is not evidence of wrongdoing. Note the scan and allow the student through. Do not detain, question further, or confiscate.',
  carrierUnverified: true,
};

export function resolveVerification(subject: VerificationSubject): VerificationOutcome {
  if (!subject.productFound || subject.retired) return NOT_REGISTERED;

  const carrierUnverified = !subject.carrierUserId;

  // 1. An open missing/ theft report outranks everything else. The person
  //    carrying the device may be a finder, a buyer, or the owner who forgot to
  //    withdraw the report — only a human can tell.
  if (subject.hasActiveMissingReport) {
    return {
      result: 'ACTIVE_MISSING_REPORT',
      tone: 'danger',
      headline: 'Reported missing',
      detail: `${subject.productLabel ?? 'This device'} has an open missing-item report filed by its registered owner (${subject.ownerName ?? 'owner on file'}).`,
      action:
        'Do not accuse, detain or confiscate on the basis of this screen alone. Ask the carrier to wait with a supervisor, record the encounter, and follow the institution’s written procedure.',
      carrierUnverified,
    };
  }

  // 2. Registered owner is carrying their own device.
  if (subject.carrierUserId && subject.ownerId && subject.carrierUserId === subject.ownerId) {
    return {
      result: 'REGISTERED_OK',
      tone: 'ok',
      headline: 'Registered — owner confirmed',
      detail: `${subject.productLabel ?? 'Device'} is registered to ${subject.ownerName ?? 'the carrier'}. No active reports.`,
      action: 'Allow the student to proceed.',
      carrierUnverified: false,
    };
  }

  // 3. Someone else is carrying it, but the owner authorised it.
  if (subject.borrowerAuthorized) {
    return {
      result: 'AUTHORIZED_BORROWER',
      tone: 'ok',
      headline: 'Registered — authorised borrower',
      detail: `${subject.productLabel ?? 'Device'} belongs to ${subject.ownerName ?? 'another student'}, who has authorised this borrower for the current period.`,
      action: 'Confirm the carrier is the authorised borrower (ID check), then allow through.',
      carrierUnverified,
    };
  }

  // 4. Carrier identified, is not the owner, and has no authorisation.
  if (subject.carrierUserId && subject.ownerId && subject.carrierUserId !== subject.ownerId) {
    return {
      result: 'MISMATCH',
      tone: 'warn',
      headline: 'Carrier is not the registered owner',
      detail: `${subject.productLabel ?? 'Device'} is registered to ${subject.ownerName ?? 'another student'}. The carrier is not the owner and no borrowing authorisation is active.`,
      action:
        'Ask for clarification — borrowed informally, recently bought, or a family member’s device are all legitimate explanations. Record the encounter and escalate only per institutional procedure.',
      carrierUnverified: false,
    };
  }

  // 5. Registration is valid and clean, but the officer never checked an ID.
  return {
    result: 'REGISTERED_OK',
    tone: 'ok',
    headline: 'Registered — no active reports',
    detail: `${subject.productLabel ?? 'Device'} is registered to ${subject.ownerName ?? 'a verified student'}. No active reports. The carrier’s identity was not checked.`,
    action: 'Spot-check: confirm the carrier’s ID if the situation warrants it, then allow through.',
    carrierUnverified: true,
  };
}
