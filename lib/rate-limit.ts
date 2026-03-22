// Simple in-memory sliding-window rate limiter.
// Fine for a single-instance personal PWA — swap for Upstash Redis if you scale out.

const windows = new Map<string, number[]>();

/**
 * Returns true if the request is within the limit, false if it should be rejected.
 * @param userId  Per-user key
 * @param action  Logical action name (e.g. "chat", "wardrobe-add")
 * @param limit   Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= limit) return false;

  timestamps.push(now);
  windows.set(key, timestamps);
  return true;
}

export const HOUR = 60 * 60 * 1000;
