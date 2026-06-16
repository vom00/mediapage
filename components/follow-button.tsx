"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/client";
import { follow, followEdgeId, unfollow } from "@/lib/follows";

type EdgeState = "loading" | "none" | "pending" | "following";

export function FollowButton({
  targetUid,
  targetIsPublic,
  onChanged,
  variant = "solid",
}: {
  targetUid: string;
  // Whether the target's profile is public. Drives the label ("Follow"
  // vs "Request") and whether the new edge is instantly approved.
  targetIsPublic: boolean;
  onChanged?: () => void;
  variant?: "solid" | "glass";
}) {
  const { user, profile, status } = useAuth();
  const [state, setState] = useState<EdgeState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "follows", followEdgeId(user.uid, targetUid)),
      (snap) => {
        if (!snap.exists()) setState("none");
        else setState(snap.data().approved ? "following" : "pending");
      },
    );
  }, [user, targetUid]);

  if (status !== "ready" || !user || !profile || user.uid === targetUid) {
    return null;
  }
  if (state === "loading") {
    return <div aria-hidden="true" className="h-11 w-24" />;
  }

  async function toggle() {
    if (!user || !profile) return;
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

  const base =
    "flex min-h-11 items-center px-5 text-sm transition-all duration-200 disabled:opacity-50";
  const className =
    variant === "glass"
      ? `liquid-glass rounded-full ${base} ${
          active ? "text-ink-muted hover:text-ink" : "text-ink"
        } ease-[ease] hover:scale-[1.03] motion-reduce:hover:scale-100`
      : `${base} ${
          active
            ? "border border-edge text-ink-muted hover:border-glow hover:text-ink"
            : "border border-glow bg-ink font-medium text-bg hover:opacity-90"
        }`;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      aria-pressed={active}
      className={className}
    >
      {label}
    </button>
  );
}
