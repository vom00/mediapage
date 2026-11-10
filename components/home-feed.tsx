"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RecommendationCard } from "@/components/recommendation-card";
import { db } from "@/lib/firebase/client";
import { fetchFeed, fetchFollowing } from "@/lib/follows";
import type { RecommendationDoc } from "@/lib/recommendations";

export function HomeFeed() {
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState<RecommendationDoc[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      // Hydrated profiles rather than raw edge uids: deactivated
      // accounts drop out here, so their recommendations stay hidden
      // from feeds, as the deactivation screen promises.
      const followed = await fetchFollowing(db, user!.uid);
      const items = await fetchFeed(
        db,
        followed.map((p) => p.uid),
      );
      if (!cancelled) setFeed(items);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <h1 className="text-5xl font-medium leading-[1] tracking-[-0.04em] sm:text-7xl">
        <span className="enter-line">
          <span>Your feed</span>
        </span>
      </h1>

      {feed === null ? (
        <div aria-hidden="true" className="mt-12 flex flex-col gap-6">
          <div className="skeleton h-72 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-72 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : feed.length === 0 ? (
        <div
          className="enter-up mt-12 max-w-xl"
          style={{ "--enter-i": 1 } as React.CSSProperties}
        >
          <p className="text-2xl leading-snug text-ink">
            Your feed is quiet. Follow people whose taste you trust and their
            recommendations will land here.
          </p>
          <p className="mt-6 text-sm text-ink-muted">
            Start from your own page:{" "}
            <Link
              href={`/u/${profile?.handle}`}
              className="link text-ink"
            >
              @{profile?.handle}
            </Link>{" "}
            or browse the{" "}
            <Link
              href="/library"
              className="link text-ink"
            >
              library
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-12 flex flex-col gap-6">
          {feed.map((rec, index) => (
            <div
              key={rec.id}
              className="arrive"
              style={{ "--arrive-i": index } as React.CSSProperties}
            >
              <RecommendationCard rec={rec} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
