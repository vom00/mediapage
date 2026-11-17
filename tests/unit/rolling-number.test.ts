import { describe, expect, test } from "vitest";
import { digitsOf, rollTarget } from "@/components/rolling-number";

describe("digitsOf", () => {
  test("splits a number into digits, most significant first", () => {
    expect(digitsOf(0)).toEqual([0]);
    expect(digitsOf(9)).toEqual([9]);
    expect(digitsOf(10)).toEqual([1, 0]);
    expect(digitsOf(99)).toEqual([9, 9]);
    expect(digitsOf(100)).toEqual([1, 0, 0]);
    expect(digitsOf(1234567)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("treats anything that is not a non-negative integer as the nearest one", () => {
    expect(digitsOf(-5)).toEqual([0]);
    expect(digitsOf(Number.NaN)).toEqual([0]);
    expect(digitsOf(12.9)).toEqual([1, 2]);
    expect(digitsOf(Number.MAX_SAFE_INTEGER * 10)).toEqual(
      Array.from(String(Number.MAX_SAFE_INTEGER), Number),
    );
  });
});

describe("rollTarget", () => {
  test("rolling up wraps past 9 onto the next 0 (9 -> 10)", () => {
    expect(rollTarget(9, 0, 1)).toBe(10);
    expect(rollTarget(0, 1, 1)).toBe(1);
  });

  test("rolling down wraps below 0 onto 9 (100 -> 99)", () => {
    expect(rollTarget(0, 9, -1)).toBe(-1);
    expect(rollTarget(5, 4, -1)).toBe(4);
  });

  test("a wheel already on the digit stays put", () => {
    expect(rollTarget(3, 3, 1)).toBe(3);
    expect(rollTarget(13, 3, -1)).toBe(13);
  });

  test("a wheel mid-roll keeps heading the same way and lands on an integer", () => {
    expect(rollTarget(4.2, 5, 1)).toBe(5);
    expect(rollTarget(4.2, 4, 1)).toBe(14);
    expect(rollTarget(4.2, 4, -1)).toBe(4);
  });
});
