"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/client";
import { follow, followEdgeId, unfollow } from "@/lib/follows";

type EdgeState = "loading" | "none" | "pending" | "following";

export function FollowButton({
  targetUid,
  targetIsPublic,
  onChanged,
}: {
  targetUid: string;
  // Whether the target's profile is public. Drives the label ("Follow"
  // vs "Request") and whether the new edge is instantly approved.
  targetIsPublic: boolean;
  onChanged?: () => void;
  // Kept for existing callers; every variant renders the same button.
  variant?: "solid" | "glass";
}) {
  const { user, profile, status } = useAuth();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<EdgeState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "follows", followEdgeId(user.uid, targetUid)),
      (snap) => {
        if (!snap.exists()) setState("none");
        else setState(snap.data().approved ? "following" : "pending");
      },
      () => setState("none"),
    );
  }, [user, targetUid]);

  if (status !== "ready" || !user || !profile || user.uid === targetUid) {
    return null;
  }
  if (state === "loading") {
    return <div aria-hidden="true" className="h-11 w-[8.5rem]" />;
  }

  async function toggle() {
    if (!user || !profile) return;
    setError(null);
    setBusy(true);
    try {
      if (state === "none") {
        await follow(
          db,
          {
            uid: user.uid,
            handle: profile.handle,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          },
          targetUid,
          targetIsPublic,
        );
      } else {
        // Unfollow, or cancel a pending request — both delete our edge.
        await unfollow(db, user.uid, targetUid);
      }
      onChanged?.();
    } catch {
      // Most likely a rules denial from stale state (e.g. the target
      // flipped their privacy since the page loaded).
      setError("That didn't go through. Reload and try again.");
    } finally {
      setBusy(false);
    }
  }

  const active = state !== "none";
  const label =
    state === "following"
      ? "Following"
      : state === "pending"
        ? "Requested"
        : targetIsPublic
          ? "Follow"
          : "Request";

  // The call to follow is the primary button; an existing follow (or a
  // pending request) sits back as a plain one.
  const className = `btn min-w-[8.5rem] ${active ? "" : "btn-primary"}`;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={active}
        className={className}
      >
        <span className="grid">
          <AnimatePresence initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.15,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              style={{ gridArea: "1 / 1" }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      {error ? (
        <p
          role="alert"
          className="border-l-2 border-danger pl-2 text-xs text-ink-muted"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
