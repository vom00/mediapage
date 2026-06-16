import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/design/contrast";

const REQUIRED_TOKENS = [
  "--bg",
  "--surface",
  "--surface-raised",
  "--text",
  "--text-muted",
  "--border",
  "--glow",
] as const;

type TokenName = (typeof REQUIRED_TOKENS)[number];

function loadTokens(): Record<TokenName, string> {
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
  const tokens = {} as Record<TokenName, string>;
  for (const name of REQUIRED_TOKENS) {
    const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`).exec(css);
    if (match) {
      tokens[name] = match[1];
    }
  }
  return tokens;
}

describe("design tokens", () => {
  const tokens = loadTokens();

  test("all semantic tokens are defined as hex values in globals.css", () => {
    for (const name of REQUIRED_TOKENS) {
      expect(tokens[name], `${name} should be defined`).toBeDefined();
    }
  });

  test("--text meets 4.5:1 against every layer it sits on", () => {
    for (const layer of ["--bg", "--surface", "--surface-raised"] as const) {
      const ratio = contrastRatio(tokens["--text"], tokens[layer]);
      expect(ratio, `--text on ${layer}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("--text-muted meets 4.5:1 against every layer it sits on", () => {
    for (const layer of ["--bg", "--surface", "--surface-raised"] as const) {
      const ratio = contrastRatio(tokens["--text-muted"], tokens[layer]);
      expect(ratio, `--text-muted on ${layer}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("--glow meets 3:1 against --bg for focus indication", () => {
    expect(contrastRatio(tokens["--glow"], tokens["--bg"])).toBeGreaterThanOrEqual(3);
  });

  test("layers get progressively lighter so elevation reads visually", () => {
    const bg = relativeLuminance(tokens["--bg"]);
    const surface = relativeLuminance(tokens["--surface"]);
    const raised = relativeLuminance(tokens["--surface-raised"]);
    expect(surface).toBeGreaterThan(bg);
    expect(raised).toBeGreaterThan(surface);
  });
});
