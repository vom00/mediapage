// A small in-memory fixed-window rate limiter. One per server
// process; good enough to blunt quota abuse on a single instance.
// A multi-instance deployment would back this with a shared store
// (Redis/Upstash), but the interface stays the same.

interface Window {
  count: number;
  resetAt: number;
}

export interface RateVerdict {
  allowed: boolean;
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now: number = Date.now()): RateVerdict {
    let window = this.windows.get(key);
    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
      this.prune(now);
    }
    window.count++;
    if (window.count > this.max) {
      return { allowed: false, retryAfterMs: window.resetAt - now };
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(): void {
    this.windows.clear();
  }

  get size(): number {
    return this.windows.size;
  }

  // Keeps memory bounded under a flood of distinct keys: drop expired
  // windows first, then the oldest until back under the cap.
  private prune(now: number): void {
    if (this.windows.size <= this.maxKeys) return;
    for (const [key, window] of this.windows) {
      if (now >= window.resetAt) this.windows.delete(key);
    }
    while (this.windows.size > this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
  }
}
