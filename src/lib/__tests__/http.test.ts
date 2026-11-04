import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson, MAX_BODY_BYTES } from '../http';

/**
 * The body-size cap is a dependency-vulnerability mitigation (zod 3.x can be
 * driven to allocate unboundedly on an oversized constrained collection), so it
 * needs a test: a future refactor of readJson must not silently reintroduce
 * unlimited buffering.
 */
function request(body: string): Request {
  return new Request('http://localhost/api/test', { method: 'POST', body });
}

test('readJson parses a normal JSON body', async () => {
  assert.deepEqual(await readJson(request('{"a":1,"b":[1,2]}')), { a: 1, b: [1, 2] });
});

test('readJson returns an empty object for malformed JSON', async () => {
  assert.deepEqual(await readJson(request('not json')), {});
});

test('readJson returns an empty object when there is no body', async () => {
  assert.deepEqual(await readJson(new Request('http://localhost/api/test')), {});
});

test('readJson refuses a body larger than the cap', async () => {
  const oversized = 'x'.repeat(MAX_BODY_BYTES + 1);
  await assert.rejects(() => readJson(request(oversized)), /too large|limit/i);
});
