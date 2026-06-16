// Maps Firebase Auth error codes to messages we are willing to show
// users. Wrong-credential variants intentionally collapse into one
// neutral message so the form never reveals whether an email exists.

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":
    "That email already has an account. Try logging in instead.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Passwords need at least 6 characters.",
  "auth/invalid-credential": "That email or password didn't match. Try again.",
  "auth/user-not-found": "That email or password didn't match. Try again.",
  "auth/wrong-password": "That email or password didn't match. Try again.",
  "auth/too-many-requests":
    "Too many attempts. Wait a few minutes and try again.",
  "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
  "auth/network-request-failed":
    "Couldn't reach the server. Check your connection and try again.",
};

const FALLBACK = "Something went wrong. Please try again.";

export function authErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return MESSAGES[error.code] ?? FALLBACK;
  }
  return FALLBACK;
}
