import type { RateLimitPolicy } from "./types.js";

export interface RateLimitState {
  remaining: number;
  resetAt: number;
}

export function parseWindowMs(window: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(window.trim());
  if (!match) {
    throw new Error(`Unsupported rate-limit window: ${window}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

export class InMemoryRateLimiter {
  private buckets = new Map<string, RateLimitState>();

  check(key: string, policy: RateLimitPolicy, now = Date.now()) {
    const windowMs = parseWindowMs(policy.window);
    const existing = this.buckets.get(key);
    const limit = policy.requests;
    if (!existing || existing.resetAt <= now) {
      const state = { remaining: limit - 1, resetAt: now + windowMs };
      this.buckets.set(key, state);
      return { allowed: true, limit, remaining: state.remaining, retryAfter: undefined as number | undefined };
    }
    if (existing.remaining <= 0) {
      return { allowed: false, limit, remaining: 0, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
    }
    existing.remaining -= 1;
    return { allowed: true, limit, remaining: existing.remaining, retryAfter: undefined as number | undefined };
  }
}
