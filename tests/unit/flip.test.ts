import { describe, expect, test } from "vitest";
import { computeFlipDeltas, type FlipRect } from "@/lib/flip";

const at = (left: number, top: number): FlipRect => ({ left, top });

describe("computeFlipDeltas", () => {
  test("returns the inverted delta for an item that moved", () => {
    const prev = new Map([["a", at(100, 50)]]);
    const next = new Map([["a", at(260, 50)]]);
    // The item now lives at 260; to appear to start from 100 it must
    // be pre-transformed by -160.
    expect(computeFlipDeltas(prev, next)).toEqual(
      new Map([["a", { dx: -160, dy: 0 }]]),
    );
  });

  test("handles vertical movement and multiple items", () => {
    const prev = new Map([
      ["a", at(0, 0)],
      ["b", at(160, 0)],
    ]);
    const next = new Map([
      ["a", at(160, 0)],
      ["b", at(0, 24)],
    ]);
    expect(computeFlipDeltas(prev, next)).toEqual(
      new Map([
        ["a", { dx: -160, dy: 0 }],
        ["b", { dx: 160, dy: -24 }],
      ]),
    );
  });

  test("omits items that did not move", () => {
    const prev = new Map([
      ["a", at(0, 0)],
      ["b", at(160, 0)],
    ]);
    const next = new Map([
      ["a", at(0, 0)],
      ["b", at(320, 0)],
    ]);
    const deltas = computeFlipDeltas(prev, next);
    expect(deltas.has("a")).toBe(false);
    expect(deltas.get("b")).toEqual({ dx: -160, dy: 0 });
  });

  test("omits items without a previous position (new arrivals)", () => {
    const prev = new Map([["a", at(0, 0)]]);
    const next = new Map([
      ["a", at(0, 0)],
      ["fresh", at(160, 0)],
    ]);
    expect(computeFlipDeltas(prev, next).size).toBe(0);
  });

  test("ignores sub-pixel jitter", () => {
    const prev = new Map([["a", at(100.2, 50)]]);
    const next = new Map([["a", at(100.6, 50)]]);
    expect(computeFlipDeltas(prev, next).size).toBe(0);
  });

  test("returns an empty map for empty inputs", () => {
    expect(computeFlipDeltas(new Map(), new Map()).size).toBe(0);
  });
});
