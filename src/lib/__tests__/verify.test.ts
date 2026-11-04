import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVerification, type VerificationSubject } from '../verify';

const base: VerificationSubject = {
  productFound: true,
  retired: false,
  status: 'ACTIVE',
  ownerId: 'usr_abel',
  ownerName: 'Abel Tesfaye',
  productLabel: 'LAPTOP Lenovo ThinkPad E14',
  hasActiveMissingReport: false,
  carrierUserId: null,
  borrowerAuthorized: false,
};

test('owner carrying their own registered device passes', () => {
  const outcome = resolveVerification({ ...base, carrierUserId: 'usr_abel' });
  assert.equal(outcome.result, 'REGISTERED_OK');
  assert.equal(outcome.tone, 'ok');
  assert.equal(outcome.carrierUnverified, false);
});

test('an authorised borrower passes', () => {
  const outcome = resolveVerification({
    ...base,
    carrierUserId: 'usr_dawit',
    borrowerAuthorized: true,
  });
  assert.equal(outcome.result, 'AUTHORIZED_BORROWER');
  assert.equal(outcome.tone, 'ok');
});

test('an unauthorised carrier is flagged for a conversation, not a detention', () => {
  const outcome = resolveVerification({ ...base, carrierUserId: 'usr_other' });
  assert.equal(outcome.result, 'MISMATCH');
  assert.equal(outcome.tone, 'warn');
  assert.match(outcome.action, /Do not|escalate|clarification/i);
});

test('an open missing report outranks everything else', () => {
  const outcome = resolveVerification({
    ...base,
    hasActiveMissingReport: true,
    carrierUserId: 'usr_abel',
    borrowerAuthorized: true,
  });
  assert.equal(outcome.result, 'ACTIVE_MISSING_REPORT');
  assert.equal(outcome.tone, 'danger');
  assert.match(outcome.action, /Do not accuse, detain or confiscate/);
});

test('an unknown code is not registered — and is explicitly not suspicious', () => {
  const outcome = resolveVerification({ ...base, productFound: false });
  assert.equal(outcome.result, 'NOT_REGISTERED');
  assert.match(outcome.action, /not evidence of wrongdoing/);
});

test('a retired registration is treated as not registered', () => {
  const outcome = resolveVerification({ ...base, retired: true, status: 'RETIRED' });
  assert.equal(outcome.result, 'NOT_REGISTERED');
});

test('when no ID was checked the result says so', () => {
  const outcome = resolveVerification(base);
  assert.equal(outcome.result, 'REGISTERED_OK');
  assert.equal(outcome.carrierUnverified, true);
  assert.match(outcome.detail, /identity was not checked/);
});

test('every outcome carries an instruction — none is a verdict', () => {
  const variants = [
    resolveVerification({ ...base, carrierUserId: 'usr_abel' }),
    resolveVerification({ ...base, carrierUserId: 'usr_dawit', borrowerAuthorized: true }),
    resolveVerification({ ...base, carrierUserId: 'usr_other' }),
    resolveVerification({ ...base, hasActiveMissingReport: true }),
    resolveVerification({ ...base, productFound: false }),
  ];
  for (const outcome of variants) {
    assert.ok(outcome.action.length > 20, `action missing for ${outcome.result}`);
    assert.ok(outcome.headline.length > 0);
    assert.ok(['ok', 'info', 'warn', 'danger'].includes(outcome.tone));
  }
});
