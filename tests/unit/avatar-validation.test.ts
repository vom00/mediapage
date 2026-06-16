import { describe, expect, test } from "vitest";
import { AVATAR_MAX_BYTES, validateAvatarFile } from "@/lib/avatar";

function fakeFile(type: string, size: number) {
  return { type, size };
}

describe("validateAvatarFile", () => {
  test("accepts a small jpeg, png, and webp", () => {
    expect(validateAvatarFile(fakeFile("image/jpeg", 1024))).toEqual({ ok: true });
    expect(validateAvatarFile(fakeFile("image/png", 1024))).toEqual({ ok: true });
    expect(validateAvatarFile(fakeFile("image/webp", 1024))).toEqual({ ok: true });
  });

  test("rejects non-image types with a readable reason", () => {
    const result = validateAvatarFile(fakeFile("application/pdf", 1024));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/jpeg, png, or webp/i);
    }
  });

  test("rejects svg specifically (no script-bearing images)", () => {
    expect(validateAvatarFile(fakeFile("image/svg+xml", 1024))).toMatchObject({
      ok: false,
    });
  });

  test("rejects files over 5MB and accepts exactly 5MB", () => {
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(
      validateAvatarFile(fakeFile("image/png", AVATAR_MAX_BYTES + 1)),
    ).toMatchObject({ ok: false });
    expect(validateAvatarFile(fakeFile("image/png", AVATAR_MAX_BYTES))).toEqual({
      ok: true,
    });
  });

  test("size failure reason mentions the 5MB limit", () => {
    const result = validateAvatarFile(fakeFile("image/png", AVATAR_MAX_BYTES * 2));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/5\s?MB/i);
    }
  });
});
