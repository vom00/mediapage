"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { buttonClass, FieldError } from "@/components/form-field";
import { db } from "@/lib/firebase/client";
import { setAccountDeleted } from "@/lib/settings";

// Position in the one first-screen entrance (see .enter-up).
const step = (i: number) => ({ "--enter-i": i }) as React.CSSProperties;

// A single card: what deactivation hid, and one button to undo it.
export function DeactivatedNotice() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reactivate() {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      await setAccountDeleted(db, user.uid, false);
      // The profile snapshot updates and HomeView swaps to the feed.
    } catch {
      setError("Reactivation didn't go through. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-28">
      <div className="card p-7 sm:p-12">
        <h1 className="text-4xl leading-[1.05] sm:text-6xl">
          <span className="enter-line">
            <span>Your account is deactivated</span>
          </span>
        </h1>
        <p
          className="enter-up mt-6 max-w-md text-lg text-ink-muted"
          style={step(1)}
        >
          Your page, shelves, and recommendations are hidden, not deleted.
          Reactivate to bring everything back as you left it.
        </p>
        <button
          type="button"
          onClick={() => void reactivate()}
          disabled={busy}
          className={`${buttonClass} enter-up mt-9 sm:w-auto sm:min-w-64`}
          style={step(2)}
        >
          Reactivate my account
        </button>
        {error ? (
          <div role="alert">
            <FieldError id="reactivate-error" message={error} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
