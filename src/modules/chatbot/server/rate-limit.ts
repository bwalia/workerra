// Fixed-window rate limit per client, in process memory. Enough for a single
// replica; switch to a shared store (Redis) before scaling the web tier out.

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
  maxKeys?: number;
}) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      if (windows.size >= maxKeys) {
        windows.forEach((w, k) => w.resetAt <= t && windows.delete(k));
      }
      let w = windows.get(key);
      if (!w || w.resetAt <= t) {
        w = { count: 0, resetAt: t + windowMs };
        windows.set(key, w);
      }
      w.count++;
      return { allowed: w.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((w.resetAt - t) / 1000)) };
    },
  };
}

/** Client identity for rate limiting: first X-Forwarded-For hop (set by the edge proxy). */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
