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
      className="reveal mt-4 border-t border-edge py-8"
      style={{ "--reveal-delay": "660ms" } as React.CSSProperties}
    >
      <h2
        id="recommendations-heading"
        className="font-display text-2xl tracking-tight"
      >
        Recommendations
      </h2>

      {recs === null ? (
        <div aria-hidden="true" className="mt-5 flex flex-col gap-4">
          <div className="skeleton h-32 w-full" />
        </div>
      ) : recs.length === 0 ? (
        <p className="mt-5 max-w-md text-ink-muted">
          {isOwner ? (
            <>
              Nothing recommended yet. Open anything in the{" "}
              <Link
                href="/library"
                className="underline underline-offset-4 hover:text-ink"
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
        <div className="mt-5 flex flex-col gap-5">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
