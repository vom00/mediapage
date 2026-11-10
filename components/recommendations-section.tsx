"use client";

import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RecommendationCard } from "@/components/recommendation-card";
import { db } from "@/lib/firebase/client";
import { PROFILE_REC_LIMIT, type RecommendationDoc } from "@/lib/recommendations";

export function RecommendationsSection({ uid }: { uid: string }) {
  const { user } = useAuth();
  const [recs, setRecs] = useState<RecommendationDoc[] | null>(null);
  const isOwner = user?.uid === uid;

  useEffect(() => {
    return onSnapshot(
      query(
        collection(db, "recommendations"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc"),
        limit(PROFILE_REC_LIMIT),
      ),
      (snap) => {
        setRecs(
          snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as RecommendationDoc,
          ),
        );
      },
      // On a denied/failed subscription, show the empty state rather
      // than a skeleton forever.
      () => setRecs([]),
    );
  }, [uid]);

  return (
    <section
      aria-labelledby="recommendations-heading"
      className="py-8 sm:py-10"
      style={{ "--shelf-hue": "var(--accent)" } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="shelf-mark" />
        <h2
          id="recommendations-heading"
          className="text-2xl font-medium leading-none sm:text-3xl"
        >
          Recommendations
        </h2>
      </div>

      {recs === null ? (
        <div aria-hidden="true" className="mt-8 flex max-w-3xl flex-col gap-5">
          <div className="skeleton h-72 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : recs.length === 0 ? (
        <p className="mt-8 max-w-md text-lg text-ink-muted">
          {isOwner ? (
            <>
              Nothing recommended yet. Open anything in the{" "}
              <Link
                href="/library"
                className="link text-ink"
              >
                library
              </Link>{" "}
              and hit Recommend.
            </>
          ) : (
            "No recommendations yet."
          )}
        </p>
      ) : (
        <div className="mt-8 flex max-w-3xl flex-col gap-6">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
