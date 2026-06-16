import { describe, expect, test } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/design/contrast";

describe("relativeLuminance", () => {
  test("pure black is 0", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  test("pure white is 1", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  test("accepts shorthand hex", () => {
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  test("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  test("is symmetric in its arguments", () => {
    expect(contrastRatio("#0A0A0B", "#A1A1AA")).toBeCloseTo(
      contrastRatio("#A1A1AA", "#0A0A0B"),
      5,
    );
  });

  test("same color is 1:1", () => {
    expect(contrastRatio("#141416", "#141416")).toBeCloseTo(1, 5);
  });

  test("matches a known WCAG reference value (#777777 on #FFFFFF is ~4.48)", () => {
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  test("throws on malformed hex", () => {
    expect(() => contrastRatio("#GGGGGG", "#FFFFFF")).toThrow();
    expect(() => contrastRatio("not-a-color", "#FFFFFF")).toThrow();
  });
});
