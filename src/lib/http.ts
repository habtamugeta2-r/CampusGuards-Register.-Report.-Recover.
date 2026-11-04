import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from './auth';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

class ConflictError extends Error {}
class NotFoundError extends Error {}
class BodyTooLargeError extends Error {}

/**
 * Largest request body the API will read.
 *
 * Two reasons, both found while reviewing the dependencies: zod (still on 3.x
 * here) can be driven to allocate unboundedly while validating an oversized
 * constrained collection, and no CampusGuard endpoint legitimately needs to
 * accept more than this — the biggest is an officer's offline scan batch, which
 * is a few hundred bytes per scan. 2 MB is ~13,000 queued scans.
 */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Postgres error codes we translate into HTTP responses. */
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

type Handler<C> = (req: Request, ctx: C) => Promise<NextResponse | Response>;

/**
 * Wraps a route handler so expected failures become clean JSON errors and
 * unexpected ones are logged with a short reference id instead of leaking
 * stack traces.
 */
export function route<C = unknown>(handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<NextResponse | Response> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ZodError) {
        return fail(400, 'The submitted data is invalid.', {
          issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      if (error instanceof AuthError) {
        return fail(error.status, error.message);
      }
      if (error instanceof ConflictError) return fail(409, error.message);
      if (error instanceof NotFoundError) return fail(404, error.message);
      if (error instanceof BodyTooLargeError) return fail(413, 'That request is too large.');

      const pg = error as { code?: string; detail?: string };
      if (pg?.code === UNIQUE_VIOLATION) return fail(409, 'That record already exists.');
      if (pg?.code === FOREIGN_KEY_VIOLATION) return fail(400, 'Related record is missing or in use.');

      const ref = Math.random().toString(36).slice(2, 10);
      console.error(`[api:${ref}]`, error);
      return fail(500, 'Something went wrong. Reference: ' + ref);
    }
  };
}

export function conflict(message = 'That record already exists.'): never {
  throw new ConflictError(message);
}

export function notFound(message = 'Record not found.'): never {
  throw new NotFoundError(message);
}

/** Reads the body from the stream, refusing to buffer more than the cap. */
async function readBody(req: Request): Promise<string> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError('Request body exceeds the limit.');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return JSON.parse(await readBody(req));
  } catch (error) {
    if (error instanceof BodyTooLargeError) throw error;
    return {};
  }
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip');
}

export function userAgent(req: Request): string | null {
  return req.headers.get('user-agent');
}
