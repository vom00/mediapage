"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { buttonClass } from "@/components/form-field";
import { db } from "@/lib/firebase/client";
import { setAccountDeleted } from "@/lib/settings";

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
    <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
      <h1 className="font-display text-4xl tracking-tight">
        Your account is deactivated
      </h1>
      <p className="mt-4 max-w-md text-ink-muted">
        Your page, shelves, and recommendations are hidden, not deleted.
        Reactivate to bring everything back exactly as you left it.
      </p>
      <button
        type="button"
        onClick={() => void reactivate()}
        disabled={busy}
        className={`${buttonClass} mt-8 max-w-xs`}
      >
        Reactivate my account
      </button>
      {error ? (
        <p role="alert" className="mt-4 border-l-2 border-glow pl-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
