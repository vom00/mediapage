// Handles are the public identity at /u/[handle]. They are stored
// lowercased and uniqueness is enforced by the handles/{handle}
// lookup collection, so normalization here must stay in sync with
// the format rules in firestore.rules.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

// Route names and product words that can never be claimed. Mirrored
// in firestore.rules (validHandle), where it is actually enforced —
// keep the two lists in sync.
const RESERVED = new Set([
  "api",
  "about",
  "admin",
  "feed",
  "help",
  "home",
  "library",
  "login",
  "logout",
  "mediapage",
  "notifications",
  "onboarding",
  "people",
  "privacy",
  "search",
  "settings",
  "signup",
  "support",
  "terms",
  "u",
  "user",
  "users",
]);

export type HandleValidation = { ok: true } | { ok: false; reason: string };

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function validateHandle(handle: string): HandleValidation {
  if (handle.length < HANDLE_MIN) {
    return {
      ok: false,
      reason: `Handles need at least ${HANDLE_MIN} characters.`,
    };
  }
  if (handle.length > HANDLE_MAX) {
    return {
      ok: false,
      reason: `Handles can have at most ${HANDLE_MAX} characters.`,
    };
  }
  if (!/^[a-z]/.test(handle)) {
    return { ok: false, reason: "Handles must start with a letter." };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(handle)) {
    return {
      ok: false,
      reason: "Handles can only use lowercase letters, numbers, and underscores.",
    };
  }
  if (RESERVED.has(handle)) {
    return { ok: false, reason: "That handle is reserved." };
  }
  return { ok: true };
}
