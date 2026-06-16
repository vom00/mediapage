import { describe, expect, test } from "vitest";
import { formatRelativeTime } from "@/lib/relative-time";

const NOW = new Date("2026-06-10T12:00:00Z");
const secondsAgo = (s: number) => new Date(NOW.getTime() - s * 1000);

describe("formatRelativeTime", () => {
  test("under a minute reads as just now", () => {
    expect(formatRelativeTime(secondsAgo(5), NOW)).toBe("just now");
    expect(formatRelativeTime(secondsAgo(59), NOW)).toBe("just now");
  });

  test("minutes", () => {
    expect(formatRelativeTime(secondsAgo(60), NOW)).toBe("1m ago");
    expect(formatRelativeTime(secondsAgo(59 * 60), NOW)).toBe("59m ago");
  });

  test("hours", () => {
    expect(formatRelativeTime(secondsAgo(60 * 60), NOW)).toBe("1h ago");
    expect(formatRelativeTime(secondsAgo(23 * 60 * 60), NOW)).toBe("23h ago");
  });

  test("days up to a week", () => {
    expect(formatRelativeTime(secondsAgo(24 * 60 * 60), NOW)).toBe("1d ago");
    expect(formatRelativeTime(secondsAgo(6 * 24 * 60 * 60), NOW)).toBe("6d ago");
  });

  test("older dates fall back to a short date", () => {
    const result = formatRelativeTime(secondsAgo(8 * 24 * 60 * 60), NOW);
    expect(result).toMatch(/jun 2, 2026/i);
  });

  test("future or skewed timestamps clamp to just now", () => {
    expect(formatRelativeTime(secondsAgo(-30), NOW)).toBe("just now");
  });
});
