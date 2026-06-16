import { describe, expect, test } from "vitest";
import { chunk } from "@/lib/chunk";

describe("chunk", () => {
  test("splits an array into fixed-size groups", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("returns one group when the array fits", () => {
    expect(chunk([1, 2], 30)).toEqual([[1, 2]]);
  });

  test("returns no groups for an empty array", () => {
    expect(chunk([], 30)).toEqual([]);
  });

  test("rejects non-positive sizes", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
