"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RecommendationCard } from "@/components/recommendation-card";
import { db } from "@/lib/firebase/client";
import { fetchFeed, fetchFollowedUids } from "@/lib/follows";
import type { RecommendationDoc } from "@/lib/recommendations";

export function HomeFeed() {
  const { user, profile } = useAuth();
  const [feed, setFeed] = useState<RecommendationDoc[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const followed = await fetchFollowedUids(db, user!.uid);
      const items = await fetchFeed(db, followed);
      if (!cancelled) setFeed(items);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <p className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        Fresh from the people you follow
      </p>
      <h1 className="reveal mt-3 font-display text-4xl tracking-tight sm:text-5xl">
        Your feed
      </h1>

      {feed === null ? (
        <div aria-hidden="true" className="mt-10 flex flex-col gap-5">
          <div className="skeleton h-36 w-full" />
          <div className="skeleton h-36 w-full" />
        </div>
      ) : feed.length === 0 ? (
        <div className="reveal mt-10 max-w-md" style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <p className="text-lg text-ink-muted">
            Your feed is quiet. Follow people whose taste you trust and their
            recommendations will land here.
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            Start from your own page:{" "}
            <Link
              href={`/u/${profile?.handle}`}
              className="underline underline-offset-4 hover:text-ink"
            >
              @{profile?.handle}
            </Link>{" "}
            or browse the{" "}
            <Link
              href="/library"
              className="underline underline-offset-4 hover:text-ink"
            >
              library
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-5">
          {feed.map((rec, i) => (
            <div
              key={rec.id}
              className="reveal"
              style={{ "--reveal-delay": `${120 + i * 70}ms` } as React.CSSProperties}
            >
              <RecommendationCard rec={rec} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
