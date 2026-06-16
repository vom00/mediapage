import { describe, expect, test } from "vitest";
import { normalizeHandle, validateHandle } from "@/lib/handles";

describe("normalizeHandle", () => {
  test("lowercases", () => {
    expect(normalizeHandle("FilmFan")).toBe("filmfan");
  });

  test("strips a leading @ and surrounding whitespace", () => {
    expect(normalizeHandle("  @FilmFan ")).toBe("filmfan");
  });
});

describe("validateHandle", () => {
  test("accepts a simple lowercase handle", () => {
    expect(validateHandle("filmfan")).toEqual({ ok: true });
  });

  test("accepts digits and underscores after the first letter", () => {
    expect(validateHandle("film_fan_99")).toEqual({ ok: true });
  });

  test("rejects handles shorter than 3 characters", () => {
    expect(validateHandle("ab")).toMatchObject({ ok: false });
  });

  test("rejects handles longer than 20 characters", () => {
    expect(validateHandle("a".repeat(21))).toMatchObject({ ok: false });
  });

  test("accepts exactly 3 and exactly 20 characters", () => {
    expect(validateHandle("abc")).toEqual({ ok: true });
    expect(validateHandle("a".repeat(20))).toEqual({ ok: true });
  });

  test("rejects handles that do not start with a letter", () => {
    expect(validateHandle("9lives")).toMatchObject({ ok: false });
    expect(validateHandle("_hidden")).toMatchObject({ ok: false });
  });

  test("rejects uppercase, spaces, and symbols", () => {
    expect(validateHandle("FilmFan")).toMatchObject({ ok: false });
    expect(validateHandle("film fan")).toMatchObject({ ok: false });
    expect(validateHandle("film-fan")).toMatchObject({ ok: false });
    expect(validateHandle("film.fan")).toMatchObject({ ok: false });
  });

  test("rejects reserved route names", () => {
    for (const reserved of ["login", "settings", "library", "api", "onboarding"]) {
      expect(validateHandle(reserved), reserved).toMatchObject({ ok: false });
    }
  });

  test("failure reasons are human-readable sentences", () => {
    const result = validateHandle("ab");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/at least 3/i);
    }
  });
});
