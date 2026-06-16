import { describe, expect, test } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  test("allows up to max requests in a window", () => {
    const rl = new RateLimiter(3, 1000);
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 10).allowed).toBe(true);
    expect(rl.check("a", 20).allowed).toBe(true);
  });

  test("blocks the request past the limit, with a retry hint", () => {
    const rl = new RateLimiter(2, 1000);
    rl.check("a", 0);
    rl.check("a", 100);
    const verdict = rl.check("a", 200);
    expect(verdict.allowed).toBe(false);
    expect(verdict.retryAfterMs).toBe(800); // window resets at 1000
  });

  test("starts a fresh window after it elapses", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 500).allowed).toBe(false);
    expect(rl.check("a", 1000).allowed).toBe(true); // new window
    expect(rl.check("a", 1100).allowed).toBe(false);
  });

  test("tracks each key independently", () => {
    const rl = new RateLimiter(1, 1000);
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 0).allowed).toBe(false);
  });

  test("reset clears all counters", () => {
    const rl = new RateLimiter(1, 1000);
    rl.check("a", 0);
    rl.reset();
    expect(rl.check("a", 0).allowed).toBe(true);
  });

  test("bounds memory by evicting old keys past the cap", () => {
    const rl = new RateLimiter(5, 1000, 2);
    rl.check("a", 0);
    rl.check("b", 0);
    rl.check("c", 0); // exceeds cap of 2, prunes
    // Should not retain all three live windows.
    expect(rl.size).toBeLessThanOrEqual(2);
  });
});
