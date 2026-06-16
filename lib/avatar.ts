// Avatar upload constraints, enforced again in storage.rules.
// SVG is deliberately excluded: it can carry scripts.

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarValidation = { ok: true } | { ok: false; reason: string };

export function validateAvatarFile(file: {
  type: string;
  size: number;
}): AvatarValidation {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, reason: "Profile pictures must be JPEG, PNG, or WebP." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, reason: "Profile pictures can be at most 5MB." };
  }
  return { ok: true };
}
