import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent, hoursBetween, formatRelative } from '../format';
import { maskSerial } from '../qr';

test('percentages survive a zero denominator', () => {
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(3, 4), 75);
  assert.equal(percent(1, 3), 33.3);
});

test('recovery time is measured in hours', () => {
  const start = new Date('2026-03-01T08:00:00Z');
  const end = new Date('2026-03-02T20:00:00Z');
  assert.equal(hoursBetween(start, end), 36);
});

test('relative dates read naturally', () => {
  assert.equal(formatRelative(new Date(Date.now() - 30_000)), 'just now');
  assert.equal(formatRelative(new Date(Date.now() - 3 * 3_600_000)), '3 h ago');
  assert.equal(formatRelative(null), '—');
});

test('serial numbers are masked before they reach an officer', () => {
  assert.equal(maskSerial('PF3K9X21'), '••••9X21');
  assert.equal(maskSerial('abc'), 'abc');
  assert.equal(maskSerial(null), null);
});
