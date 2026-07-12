"use client";

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { db } from "@/lib/firebase/client";
import { PROFILE_REC_LIMIT, type RecommendationDoc } from "@/lib/recommendations";
import { PIECE_ASPECT } from "@/lib/shelf-piece";
import { SHELF_PREVIEW_COUNT, WATCHLIST, type ShelfKey } from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";

// The compact, one-page alternative to the stacked shelves: the
// watchlist and recommendations sit in a left column, the five media
// shelves in a right column, and every pick is a small flat cover so
// the whole profile can be taken in at a glance without scrolling.

// Each shelf shows the same featured count as the stacked layout (5);
// a "+N" tile then expands the shelf in place to reveal the rest, with
// a "Show less" to collapse it again. Recommendations grow downward,
// capped at the shared PROFILE_REC_LIMIT.

// Each compact shelf self-subscribes to its one shelf doc, mirroring how
// the stacked ShelfRow works (a category is one component, one listener).
function useShelf(uid: string, shelfKey: ShelfKey): MediaItem[] {
  const [picks, setPicks] = useState<MediaItem[]>([]);
  useEffect(() => {
    return onSnapshot(
      doc(db, "users", uid, "shelves", shelfKey),
      (snap) => {
        setPicks(
          snap.exists()
            ? ((snap.data() as { picks?: MediaItem[] }).picks ?? [])
            : [],
        );
      },
      // Access revoked mid-view (e.g. the owner went followers-only):
      // clear rather than keep showing shelves we can no longer read.
      () => setPicks([]),
    );
  }, [uid, shelfKey]);
  return picks;
}

function CoverTile({ item, aspect }: { item: MediaItem; aspect: string }) {
  return (
    <div className="group w-16" title={item.title}>
      <div
        className={`relative w-full overflow-hidden rounded-sm border border-edge bg-surface ${aspect}`}
      >
        <CoverImage src={item.imageUrl} alt={item.title} />
      </div>
    </div>
  );
}

// The "+N" overflow tile doubles as the "see all" control: clicking it
// expands the shelf in place so every pick is reachable from the grid.
function MoreTile({
  count,
  aspect,
  label,
  onClick,
}: {
  count: number;
  aspect: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show all ${label}`}
      className={`flex w-16 items-center justify-center rounded-sm border border-edge bg-surface text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink ${aspect}`}
    >
      <span className="font-label text-xs">+{count}</span>
    </button>
  );
}

function AddTile({ href, aspect }: { href: string; aspect: string }) {
  return (
    <Link
      href={href}
      aria-label="Add to this shelf"
      className={`flex w-16 items-center justify-center rounded-sm border border-dashed border-edge text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink ${aspect}`}
    >
      <Plus aria-hidden="true" className="size-5" />
    </Link>
  );
}

function CompactShelf({
  uid,
  shelfKey,
  label,
  aspect,
  isOwner,
  addHref,
}: {
  uid: string;
  shelfKey: ShelfKey;
  label: string;
  aspect: string;
  isOwner: boolean;
  addHref: string;
}) {
  const picks = useShelf(uid, shelfKey);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? picks : picks.slice(0, SHELF_PREVIEW_COUNT);
  const extra = picks.length - visible.length;

  return (
    <section aria-labelledby={`grid-${shelfKey}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id={`grid-${shelfKey}`}
          className="font-display text-lg tracking-tight"
        >
          {label}
        </h3>
        {picks.length > 0 ? (
          <span className="font-label text-xs text-ink-muted">
            {picks.length}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map((item) => (
          <CoverTile key={item.id} item={item} aspect={aspect} />
        ))}
        {extra > 0 ? (
          <MoreTile
            count={extra}
            aspect={aspect}
            label={label}
            onClick={() => setExpanded(true)}
          />
        ) : null}
        {picks.length === 0 ? (
          isOwner ? (
            <AddTile href={addHref} aspect={aspect} />
          ) : (
            <p className="text-sm text-ink-muted">Nothing here yet.</p>
          )
        ) : null}
      </div>
      {expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 font-label text-xs uppercase tracking-[0.2em] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
        >
          Show less
        </button>
      ) : null}
    </section>
  );
}

function CompactRecommendations({
  uid,
  isOwner,
}: {
  uid: string;
  isOwner: boolean;
}) {
  const [recs, setRecs] = useState<RecommendationDoc[] | null>(null);

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
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecommendationDoc),
        );
      },
      () => setRecs([]),
    );
  }, [uid]);

  return (
    <section aria-labelledby="grid-recs">
      <h3 id="grid-recs" className="font-display text-lg tracking-tight">
        Recommendations
      </h3>
      {recs === null ? (
        <div aria-hidden="true" className="skeleton mt-3 h-16 w-full" />
      ) : recs.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          {isOwner ? "Recommend something from the library." : "No recommendations yet."}
        </p>
      ) : (
        <ul className="mt-3 flex list-none flex-col gap-3 p-0">
          {recs.map((rec) => (
            <li key={rec.id} className="flex gap-3">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm border border-edge bg-surface">
                <CoverImage src={rec.item.imageUrl} alt={rec.item.title} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{rec.item.title}</p>
                <p className="line-clamp-2 text-xs text-ink-muted">{rec.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProfileGrid({
  uid,
  isOwner,
}: {
  uid: string;
  isOwner: boolean;
}) {
  return (
    <div className="mt-12 grid gap-x-10 gap-y-10 lg:grid-cols-2">
      <div className="flex flex-col gap-8">
        <CompactShelf
          uid={uid}
          shelfKey={WATCHLIST}
          label="Watchlist"
          aspect="aspect-[2/3]"
          isOwner={isOwner}
          addHref="/library"
        />
        <CompactRecommendations uid={uid} isOwner={isOwner} />
      </div>
      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => (
          <CompactShelf
            key={category}
            uid={uid}
            shelfKey={category}
            label={CATEGORY_LABELS[category]}
            aspect={PIECE_ASPECT[category]}
            isOwner={isOwner}
            addHref={`/library?category=${category}`}
          />
        ))}
      </div>
    </div>
  );
}
