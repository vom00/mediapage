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
    const follows = collection(db, "follows");
    const [followers, following] = await Promise.all([
      getCountFromServer(query(follows, where("followedUid", "==", uid))),
      getCountFromServer(query(follows, where("followerUid", "==", uid))),
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
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="skeleton h-24 w-24 rounded-full sm:h-28 sm:w-28" />
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-4 w-40" />
      </div>
    );
  }

  if (state.kind === "notFound") {
    return (
      <div className="max-w-md">
        <h1 className="font-display text-4xl tracking-tight">
          Nothing on this shelf
        </h1>
        <p className="mt-4 text-ink-muted">
          Nobody has claimed @{handle} yet. It could be yours.
        </p>
        <Link
          href="/login"
          className="liquid-glass mt-6 inline-flex min-h-11 items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90"
        >
          Claim your page
        </Link>
      </div>
    );
  }

  if (state.kind === "private") {
    return (
      <div className="max-w-md">
        <h1 className="font-display text-4xl tracking-tight">
          This page is followers-only
        </h1>
        <p className="mt-4 text-ink-muted">
          @{handle} shares their shelves with followers. Request to follow,
          and once they approve you, their shelves open up.
        </p>
        <div className="mt-6">
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
      <header className="reveal flex flex-wrap items-center gap-6">
        <Avatar
          src={profile.avatarUrl}
          name={profile.displayName}
          alt={`${profile.displayName}'s profile picture`}
          className="size-24 rounded-full border border-edge bg-surface text-3xl sm:size-28 sm:text-4xl"
        />
        <div className="min-w-0">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            {profile.displayName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
            <span className="font-label">@{profile.handle}</span>
            <span>
              <Link
                href={`/u/${profile.handle}/followers`}
                className="transition-colors duration-200 hover:text-ink"
              >
                {counts.followers} followers
              </Link>
              {" · "}
              <Link
                href={`/u/${profile.handle}/following`}
                className="transition-colors duration-200 hover:text-ink"
              >
                {counts.following} following
              </Link>
            </span>
          </p>
          {profile.bio ? (
            <p className="mt-3 max-w-xl text-ink-muted">{profile.bio}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleLayout}
            aria-label={
              layout === "grid"
                ? "Switch to the stacked layout"
                : "Switch to the compact grid layout"
            }
            className="liquid-glass flex min-h-11 items-center gap-2 rounded-full px-5 text-sm text-ink transition-opacity duration-200 hover:opacity-90"
          >
            {layout === "grid" ? (
              <LayoutList aria-hidden="true" className="size-4" />
            ) : (
              <LayoutGrid aria-hidden="true" className="size-4" />
            )}
            <span>{layout === "grid" ? "Stacked" : "Grid"}</span>
          </button>
          {isOwner ? (
            <Link
              href="/settings"
              className="liquid-glass flex min-h-11 items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90"
            >
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
      </header>

      {layout === "grid" ? (
        <ProfileGrid uid={uid} isOwner={isOwner} />
      ) : (
        <>
          <div className="mt-12">
            {CATEGORY_ORDER.map((category, i) => (
              <ShelfRow
                key={category}
                uid={uid}
                shelfKey={category}
                label={CATEGORY_LABELS[category]}
                isOwner={isOwner}
                revealDelay={120 + i * 90}
                addHref={`/library?category=${category}`}
              />
            ))}
            <ShelfRow
              key="watchlist"
              uid={uid}
              shelfKey={WATCHLIST}
              label="Watchlist"
              isOwner={isOwner}
              revealDelay={120 + CATEGORY_ORDER.length * 90}
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
