import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { LruCache } from "@/lib/cache";

describe("LruCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("stores and returns values", () => {
    const cache = new LruCache<string>({ maxEntries: 10, ttlMs: 1000 });
    cache.set("a", "alpha");
    expect(cache.get("a")).toBe("alpha");
  });

  test("returns undefined for missing keys", () => {
    const cache = new LruCache<string>({ maxEntries: 10, ttlMs: 1000 });
    expect(cache.get("missing")).toBeUndefined();
  });

  test("expires entries after the TTL", () => {
    const cache = new LruCache<string>({ maxEntries: 10, ttlMs: 1000 });
    cache.set("a", "alpha");
    vi.advanceTimersByTime(999);
    expect(cache.get("a")).toBe("alpha");
    vi.advanceTimersByTime(2);
    expect(cache.get("a")).toBeUndefined();
  });

  test("evicts the least recently used entry at capacity", () => {
    const cache = new LruCache<string>({ maxEntries: 2, ttlMs: 60_000 });
    cache.set("a", "alpha");
    cache.set("b", "beta");
    cache.get("a"); // refresh a; b is now least recently used
    cache.set("c", "gamma");
    expect(cache.get("a")).toBe("alpha");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("gamma");
  });

  test("overwriting a key updates the value without growing the cache", () => {
    const cache = new LruCache<string>({ maxEntries: 2, ttlMs: 60_000 });
    cache.set("a", "alpha");
    cache.set("a", "alpha2");
    cache.set("b", "beta");
    expect(cache.get("a")).toBe("alpha2");
    expect(cache.get("b")).toBe("beta");
  });

  test("clear empties the cache", () => {
    const cache = new LruCache<string>({ maxEntries: 10, ttlMs: 1000 });
    cache.set("a", "alpha");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
  });
});
