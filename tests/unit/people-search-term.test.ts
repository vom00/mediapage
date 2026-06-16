import { describe, expect, test } from "vitest";
import { profileSearchTerm } from "@/lib/people";

describe("profileSearchTerm", () => {
  test("lowercases and trims", () => {
    expect(profileSearchTerm("  CinemaVen ")).toBe("cinemaven");
  });

  test("strips a leading @", () => {
    expect(profileSearchTerm("@FilmFan")).toBe("filmfan");
  });

  test("returns an empty string for blank input", () => {
    expect(profileSearchTerm("   ")).toBe("");
    expect(profileSearchTerm("@")).toBe("");
  });

  test("keeps a partial prefix as-is (no format validation)", () => {
    expect(profileSearchTerm("ci")).toBe("ci");
  });
});
