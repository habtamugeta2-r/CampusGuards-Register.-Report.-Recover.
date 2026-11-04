type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Process-local fixed-window rate limiter.
 *
 * Adequate for a single-instance pilot deployment. Behind more than one app
 * instance, move the counter to Redis (the call sites already pass a single
 * string key, so the swap is local to this file).
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 10_000) sweep(now);
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Login throttling: 8 attempts per 10 minutes per IP+email. */
export const LOGIN_LIMIT = { limit: 8, window: 600 };
/** Public QR lookups: 30 per minute per IP (a camera app retries fast). */
export const PUBLIC_SCAN_LIMIT = { limit: 30, window: 60 };
/** General mutation throttle for anonymous endpoints. */
export const ANON_WRITE_LIMIT = { limit: 10, window: 600 };
