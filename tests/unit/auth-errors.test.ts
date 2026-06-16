import { describe, expect, test } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

function firebaseError(code: string): unknown {
  return Object.assign(new Error(code), { code });
}

describe("authErrorMessage", () => {
  test("maps email-already-in-use", () => {
    expect(authErrorMessage(firebaseError("auth/email-already-in-use"))).toMatch(
      /already has an account/i,
    );
  });

  test("maps invalid-email", () => {
    expect(authErrorMessage(firebaseError("auth/invalid-email"))).toMatch(
      /valid email/i,
    );
  });

  test("maps weak-password", () => {
    expect(authErrorMessage(firebaseError("auth/weak-password"))).toMatch(
      /at least 6 characters/i,
    );
  });

  test("maps wrong credentials to one neutral message", () => {
    const expected = /email or password.*(wrong|incorrect|didn't match|did not match)/i;
    expect(authErrorMessage(firebaseError("auth/invalid-credential"))).toMatch(expected);
    expect(authErrorMessage(firebaseError("auth/user-not-found"))).toMatch(expected);
    expect(authErrorMessage(firebaseError("auth/wrong-password"))).toMatch(expected);
  });

  test("maps too-many-requests", () => {
    expect(authErrorMessage(firebaseError("auth/too-many-requests"))).toMatch(
      /too many attempts/i,
    );
  });

  test("falls back to a generic message for unknown codes and non-errors", () => {
    expect(authErrorMessage(firebaseError("auth/some-new-code"))).toMatch(
      /something went wrong/i,
    );
    expect(authErrorMessage(undefined)).toMatch(/something went wrong/i);
    expect(authErrorMessage("boom")).toMatch(/something went wrong/i);
  });
});
