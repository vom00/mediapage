"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { LayoutGrid, LayoutList } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { FollowButton } from "@/components/follow-button";
import { ProfileGrid } from "@/components/profile-grid";
import { RecommendationsSection } from "@/components/recommendations-section";
import { ShelfRow } from "@/components/shelf-row";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { db } from "@/lib/firebase/client";
import { resolveHandle } from "@/lib/profile";
import { WATCHLIST } from "@/lib/shelves";
import type { ProfileLayout, UserProfile } from "@/lib/types";

// Where this browser remembers the viewer's layout choice. It is a
// viewer preference applied to every profile, never written to Firestore.
const LAYOUT_STORAGE_KEY = "mediapage:profile-layout";

type ViewState =
  | { kind: "loading" }
  | { kind: "notFound" }
  | { kind: "private"; uid: string }
  | { kind: "ready"; uid: string; profile: UserProfile };

export function ProfileView({ handle }: { handle: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [counts, setCounts] = useState<{ followers: number; following: number }>({
    followers: 0,
    following: 0,
  });
  // Layout is a per-viewer preference applied to every profile, not a
  // profile setting. Read this browser's saved choice as the initial
  // value (server-safe via the window guard). It only reaches the DOM
  // after the profile loads on the client — the first paint is the
  // loading skeleton — so there is no hydration mismatch.
  const [layout, setLayout] = useState<ProfileLayout>(() => {
    if (typeof window === "undefined") return "stacked";
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return saved === "grid" || saved === "stacked" ? saved : "stacked";
  });

  const loadCounts = useCallback(async (uid: string) => {
    // Approved edges only: pending requests are not followers, and
    // they are readable only by their two parties anyway.
    const follows = collection(db, "follows");
    const approved = where("approved", "==", true);
    const [followers, following] = await Promise.all([
      getCountFromServer(query(follows, where("followedUid", "==", uid), approved)),
      getCountFromServer(query(follows, where("followerUid", "==", uid), approved)),
    ]);
    setCounts({
      followers: followers.data().count,
      following: following.data().count,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const uid = await resolveHandle(db, handle);
      if (cancelled) return;
      if (!uid) {
        setState({ kind: "notFound" });
        return;
      }
      let profile: UserProfile | null = null;
      try {
        const profileSnap = await getDoc(doc(db, "users", uid));
        profile = profileSnap.exists()
          ? (profileSnap.data() as UserProfile)
          : null;
      } catch {
        // Followers-only profile and we are not on the list.
        if (!cancelled) setState({ kind: "private", uid });
        return;
      }
      if (cancelled) return;
      if (!profile || profile.deleted) {
        setState({ kind: "notFound" });
        return;
      }
      setState({ kind: "ready", uid, profile });
      await loadCounts(uid);
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Re-resolve after sign-in changes: a follower gains access.
  }, [handle, loadCounts, user]);

  if (state.kind === "loading") {
    return (
      // Same footprint as the header that replaces it: avatar, name, meta.
      <div
        aria-hidden="true"
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10"
      >
        <div className="skeleton size-28 shrink-0 rounded-full sm:size-36" />
        <div className="flex flex-col gap-4">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-14 w-72 sm:h-[4.5rem] sm:w-[28rem]" />
          <div className="skeleton h-4 w-56" />
        </div>
      </div>
    );
  }

  if (state.kind === "notFound") {
    return (
      <div className="max-w-xl">
        <h1 className="text-5xl font-medium leading-[1] sm:text-6xl">
          Nothing on this shelf
        </h1>
        <p className="mt-5 text-lg text-ink-muted">
          Nobody has claimed @{handle} yet. It could be yours.
        </p>
        <Link href="/login" className="btn btn-primary mt-8">
          Claim your page
        </Link>
      </div>
    );
  }

  if (state.kind === "private") {
    return (
      <div className="max-w-xl">
        <h1 className="text-5xl font-medium leading-[1] sm:text-6xl">
          This page is followers-only
        </h1>
        <p className="mt-5 text-lg text-ink-muted">
          @{handle} shares their shelves with followers. Request to follow,
          and once they approve you, their shelves open up.
        </p>
        <div className="mt-8">
          <FollowButton
            targetUid={state.uid}
            targetIsPublic={false}
            variant="glass"
          />
        </div>
      </div>
    );
  }

  const { uid, profile } = state;
  const isOwner = user?.uid === uid;

  function toggleLayout() {
    const next: ProfileLayout = layout === "grid" ? "stacked" : "grid";
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    } catch {
      // Storage disabled (private mode): the choice just won't persist.
    }
  }

  return (
    <div>
      <header>
        <div className="grid gap-x-10 gap-y-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
          <Avatar
            src={profile.avatarUrl}
            name={profile.displayName}
            alt={`${profile.displayName}'s profile picture`}
            className="enter-up size-28 rounded-full border border-edge bg-surface-raised text-5xl sm:size-36 sm:text-6xl"
          />
          <div className="min-w-0">
            <h1 className="text-balance break-words text-5xl font-medium leading-[1] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              <span className="enter-line">
                <span>{profile.displayName}</span>
              </span>
            </h1>
            <p
              className="enter-up mt-3 flex flex-wrap items-center gap-x-5 text-ink-muted"
              style={{ "--enter-i": 1 } as React.CSSProperties}
            >
              <span>@{profile.handle}</span>
              <span className="flex items-center gap-5">
                <Link
                  href={`/u/${profile.handle}/followers`}
                  className="inline-flex min-h-11 items-center hover:text-ink"
                >
                  <span className="link">
                    <span className="font-label text-ink">{counts.followers}</span>{" "}
                    followers
                  </span>
                </Link>
                <Link
                  href={`/u/${profile.handle}/following`}
                  className="inline-flex min-h-11 items-center hover:text-ink"
                >
                  <span className="link">
                    <span className="font-label text-ink">{counts.following}</span>{" "}
                    following
                  </span>
                </Link>
              </span>
            </p>
            {profile.bio ? (
              <p
                className="enter-up mt-2 max-w-2xl text-lg leading-relaxed text-ink-muted"
                style={{ "--enter-i": 2 } as React.CSSProperties}
              >
                {profile.bio}
              </p>
            ) : null}
          </div>
          <div
            className="enter-up flex flex-wrap items-center gap-3 lg:pb-2"
            style={{ "--enter-i": 3 } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={toggleLayout}
              aria-label={
                layout === "grid"
                  ? "Switch to the stacked layout"
                  : "Switch to the compact grid layout"
              }
              className="btn"
            >
              {layout === "grid" ? (
                <LayoutList aria-hidden="true" className="size-4" />
              ) : (
                <LayoutGrid aria-hidden="true" className="size-4" />
              )}
              <span>{layout === "grid" ? "Stacked" : "Grid"}</span>
            </button>
            {isOwner ? (
              <Link href="/settings" className="btn btn-primary">
                Edit profile
              </Link>
            ) : (
              <FollowButton
                targetUid={uid}
                targetIsPublic={profile.isPublic}
                onChanged={() => void loadCounts(uid)}
                variant="glass"
              />
            )}
          </div>
        </div>
      </header>

      {layout === "grid" ? (
        <ProfileGrid uid={uid} isOwner={isOwner} />
      ) : (
        <>
          <div className="mt-8">
            {CATEGORY_ORDER.map((category) => (
              <ShelfRow
                key={category}
                uid={uid}
                shelfKey={category}
                label={CATEGORY_LABELS[category]}
                isOwner={isOwner}
                addHref={`/library?category=${category}`}
              />
            ))}
            <ShelfRow
              key="watchlist"
              uid={uid}
              shelfKey={WATCHLIST}
              label="Watchlist"
              isOwner={isOwner}
              addHref="/library"
              mixed
            />
          </div>

          <RecommendationsSection uid={uid} />
        </>
      )}
    </div>
  );
}
