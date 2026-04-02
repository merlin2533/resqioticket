// Simple in-memory sliding window rate limiter
// Key: IP + endpoint, Value: array of timestamps

const store = new Map<string, number[]>();

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g. "login:1.2.3.4")
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Window size in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  const timestamps = store.get(key) ?? [];

  // Filter to only timestamps within the window
  const recent = timestamps.filter(t => t > windowStart);

  // Add current request
  recent.push(now);
  store.set(key, recent);

  // Cleanup old entries periodically (every 100 calls on any key)
  if (Math.random() < 0.01) {
    for (const [k, ts] of Array.from(store.entries())) {
      const filtered = (ts as number[]).filter((t: number) => t > Date.now() - windowMs);
      if (filtered.length === 0) store.delete(k);
      else store.set(k, filtered);
    }
  }

  const success = recent.length <= maxRequests;
  const resetAt = new Date(recent[0] + windowMs); // when oldest entry expires

  return {
    success,
    remaining: Math.max(0, maxRequests - recent.length),
    resetAt,
  };
}

/** Helper to extract IP from NextRequest */
export function getClientIp(request: import("next/server").NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
