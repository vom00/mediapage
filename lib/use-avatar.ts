"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";

// Comment and notification stamps deliberately omit data-URL avatars to
// stay tiny (see authorFields / requesterFields), so the picture has to
// be hydrated from the actor's live profile at render time — the same
// thing the followers/following lists already do. Results are cached per
// uid for the page's lifetime, so a feed full of comments from one
// person costs a single read, and a private profile we cannot read just
// falls back to initials.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function loadAvatar(uid: string): Promise<string | null> {
  const cached = cache.get(uid);
  if (cached !== undefined) return Promise.resolve(cached);

  let pending = inflight.get(uid);
  if (!pending) {
    pending = getDoc(doc(db, "users", uid))
      .then((snap) => {
        const url = snap.exists()
          ? ((snap.data() as { avatarUrl?: string }).avatarUrl ?? null)
          : null;
        cache.set(uid, url);
        return url;
      })
      .catch(() => {
        // Private or otherwise unreadable profile: fall back to initials.
        cache.set(uid, null);
        return null;
      })
      .finally(() => {
        inflight.delete(uid);
      });
    inflight.set(uid, pending);
  }
  return pending;
}

// Resolves the avatar to render for a user. Prefers a non-empty stamped
// avatar (a short hosted URL kept on the doc) when present; otherwise
// hydrates the picture from the profile. Returns null until resolved, so
// callers fall back to initials in the meantime. (Each caller keys this
// to a stable id, so `uid` does not change under a given instance.)
export function useAvatarUrl(
  uid: string | undefined,
  stamped?: string | null,
): string | null {
  // Only the hydrated case needs state; the stamped URL is used directly
  // below. Seed from the cache so a repeat actor renders without a flash.
  const [hydrated, setHydrated] = useState<string | null>(
    !stamped && uid ? (cache.get(uid) ?? null) : null,
  );

  useEffect(() => {
    if (stamped || !uid) return;
    let active = true;
    // setState lives in the async callback, not the effect body.
    void loadAvatar(uid).then((resolved) => {
      if (active) setHydrated(resolved);
    });
    return () => {
      active = false;
    };
  }, [uid, stamped]);

  return stamped ?? hydrated;
}
