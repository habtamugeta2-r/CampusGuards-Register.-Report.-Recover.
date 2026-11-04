import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQrToken, normalizeToken, isValidTokenFormat } from '../tokens';

test('generated tokens match the public format', () => {
  for (let i = 0; i < 500; i++) {
    assert.ok(isValidTokenFormat(generateQrToken()));
  }
});

test('tokens are unique', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i++) seen.add(generateQrToken());
  assert.equal(seen.size, 5000);
});

test('normalisation accepts what a human or camera produces', () => {
  const token = generateQrToken();
  assert.equal(normalizeToken(token), token);
  assert.equal(normalizeToken(`  ${token}  `), token);
  assert.equal(normalizeToken(token.toLowerCase()), token);
  assert.equal(normalizeToken(`https://campusguard.edu.et/s/${token}`), token);
  assert.equal(normalizeToken(token.slice(3)), token, 'a bare code is accepted without the prefix');
});

test('crockford confusions are repaired, not rejected', () => {
  // I/L → 1 and O → 0 the way a person reading a printed label would type them.
  const token = `CG-1A2B3C4D5E6F7G8H9J0K`;
  const normalized = normalizeToken(token);
  assert.ok(normalized && isValidTokenFormat(normalized));
});

test('garbage is rejected rather than guessed at', () => {
  assert.equal(normalizeToken(''), null);
  assert.equal(normalizeToken('hello world'), null);
  assert.equal(normalizeToken('CG-123'), null);
  assert.equal(normalizeToken('https://example.com/page'), null);
});
