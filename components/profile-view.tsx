"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { FollowButton } from "@/components/follow-button";
import { RecommendationsSection } from "@/components/recommendations-section";
import { ShelfRow } from "@/components/shelf-row";
import { CATEGORY_ORDER } from "@/lib/categories";
import { db } from "@/lib/firebase/client";
import { resolveHandle } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";

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
        <div className="skeleton h-16 w-16 rounded-full" />
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

  return (
    <div>
      <header className="reveal flex flex-wrap items-center gap-6">
        <Avatar
          src={profile.avatarUrl}
          name={profile.displayName}
          alt={`${profile.displayName}'s profile picture`}
          className="size-18 rounded-full border border-edge bg-surface text-2xl"
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
      </header>

      <div className="mt-12">
        {CATEGORY_ORDER.map((category, i) => (
          <ShelfRow
            key={category}
            uid={uid}
            category={category}
            isOwner={isOwner}
            revealDelay={120 + i * 90}
          />
        ))}
      </div>

      <RecommendationsSection uid={uid} />
    </div>
  );
}
