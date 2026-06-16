// Tiny in-memory LRU with TTL, used to cache upstream media API
// responses server-side. Map iteration order doubles as recency
// order: a fresh get() re-inserts the key at the back.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class LruCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly entries = new Map<string, Entry<T>>();

  constructor(options: { maxEntries: number; ttlMs: number }) {
    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
