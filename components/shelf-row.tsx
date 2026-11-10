"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { ShelfPiece } from "@/components/shelf-piece";
import { db } from "@/lib/firebase/client";
import { PIECE_ASPECT } from "@/lib/shelf-piece";
import {
  movePick,
  removePick,
  setShelfPicks,
  SHELF_PREVIEW_COUNT,
  type ShelfKey,
} from "@/lib/shelves";
import type { MediaCategory, MediaItem } from "@/lib/types";
import { useShelfMotion } from "@/lib/use-shelf-motion";

// Owner controls: quiet icon buttons with 44px targets.
const controlClass = "btn btn-quiet size-11 shrink-0 px-0";

// One hue per shelf; the watchlist (mixed media) takes the accent.
const SHELF_HUE: Record<string, string> = {
  movie: "var(--shelf-movies)",
  shows: "var(--shelf-shows)",
  music: "var(--shelf-music)",
  game: "var(--shelf-games)",
  book: "var(--shelf-books)",
};

export function ShelfRow({
  uid,
  shelfKey,
  label,
  isOwner,
  addHref,
  mixed = false,
}: {
  uid: string;
  shelfKey: ShelfKey;
  label: string;
  isOwner: boolean;
  addHref: string;
  // The watchlist holds mixed media, so each pick takes its own
  // category's shape rather than one shared aspect for the row.
  mixed?: boolean;
}) {
  const [picks, setPicks] = useState<MediaItem[]>([]);
  // Scroll snapping stays off until the first snapshot lands. Otherwise
  // the phone row snaps to the first empty slot, and when the picks are
  // inserted ahead of it the browser follows that slot and scrolls the
  // picks out of view.
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const caseRef = useShelfMotion(picks.map((p) => p.id).join("|"));

  useEffect(() => {
    return onSnapshot(
      doc(db, "users", uid, "shelves", shelfKey),
      (snap) => {
        setPicks(
          snap.exists() ? ((snap.data() as { picks?: MediaItem[] }).picks ?? []) : [],
        );
        setLoaded(true);
      },
      // Access revoked mid-view (e.g. the owner went followers-only):
      // clear rather than keep showing shelves we can no longer read.
      () => setPicks([]),
    );
  }, [uid, shelfKey]);

  async function persist(next: MediaItem[]) {
    setError(null);
    const previous = picks;
    setPicks(next);
    try {
      await setShelfPicks(db, uid, shelfKey, next);
    } catch {
      setPicks(previous);
      setError("That change didn't save. Try again.");
    }
  }

  async function handleRemove(item: MediaItem) {
    setError(null);
    try {
      await removePick(db, uid, shelfKey, item.id);
    } catch {
      setError("That change didn't save. Try again.");
    }
  }

  // One shape for the whole row so it stays even: a category shelf uses
  // its piece's aspect; the mixed watchlist uses a neutral portrait and
  // renders flat covers, since its varied media have no single piece
  // shape that could line up (a vinyl box would be an ellipse, etc.).
  const aspect = mixed
    ? "aspect-[2/3]"
    : PIECE_ASPECT[shelfKey as MediaCategory];

  // Only the featured few show until "See all" expands the rest.
  const visible = expanded ? picks : picks.slice(0, SHELF_PREVIEW_COUNT);
  const hiddenCount = Math.max(0, picks.length - SHELF_PREVIEW_COUNT);
  // Keep a near-empty shelf looking like a full row of slots; once it is
  // expanded or already at the featured count, drop the padding.
  const emptySlots =
    !expanded && picks.length < SHELF_PREVIEW_COUNT
      ? SHELF_PREVIEW_COUNT - picks.length
      : 0;

  return (
    <section
      aria-labelledby={`shelf-${shelfKey}`}
      className="py-8 sm:py-10"
      style={
        {
          "--shelf-hue": SHELF_HUE[shelfKey] ?? "var(--accent)",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-3">
        <h2
          id={`shelf-${shelfKey}`}
          className="text-2xl font-medium leading-none sm:text-3xl"
        >
          {label}
        </h2>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isOwner ? (
            <Link
              href={addHref}
              aria-label={`Add to your ${label} shelf`}
              className="btn btn-quiet px-4"
            >
              Add
            </Link>
          ) : null}
          <p className="chip font-label">{picks.length}</p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-danger pl-3 text-sm">
          {error}
        </p>
      ) : null}

      <ul
        id={`shelf-list-${shelfKey}`}
        style={loaded ? undefined : { scrollSnapType: "none" }}
        className="shelf-run -mx-6 mt-8 flex list-none items-stretch overflow-x-auto px-6 pb-7 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0"
      >
        {visible.map((item, index) => (
          <li
            key={item.id}
            className="flex w-40 shrink-0 flex-col sm:w-auto"
            draggable={isOwner}
            onDragStart={() => {
              dragFrom.current = index;
            }}
            onDragOver={(e) => {
              if (isOwner) e.preventDefault();
            }}
            onDrop={() => {
              if (!isOwner || dragFrom.current === null) return;
              void persist(movePick(picks, dragFrom.current, index));
              dragFrom.current = null;
            }}
          >
            <div className="shelf-bay">
              <div
                data-testid="shelf-case"
                ref={caseRef(item.id)}
                className={`shelf-case relative w-full ${aspect}`}
              >
                {mixed ? (
                  <div className="absolute inset-0 overflow-hidden rounded-sm border border-edge bg-surface">
                    <CoverImage
                      src={item.imageUrl}
                      alt={
                        item.year
                          ? `${item.title} (${item.year}) cover art`
                          : `${item.title} cover art`
                      }
                    />
                  </div>
                ) : (
                  <ShelfPiece item={item} />
                )}
              </div>
            </div>
            <div data-testid="shelf-plank" aria-hidden="true" className="shelf-plank" />
            <h3 className="mt-3 h-5 truncate px-2 text-center text-[13px] font-normal text-ink">
              {item.title}
            </h3>
            {isOwner ? (
              <div className="mt-2 flex flex-wrap justify-center gap-0.5 px-1">
                <button
                  type="button"
                  className={controlClass}
                  aria-label={`Move ${item.title} earlier in ${label}`}
                  disabled={index === 0}
                  onClick={() => void persist(movePick(picks, index, index - 1))}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className={controlClass}
                  aria-label={`Move ${item.title} later in ${label}`}
                  disabled={index === picks.length - 1}
                  onClick={() => void persist(movePick(picks, index, index + 1))}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className={controlClass}
                  aria-label={`Remove ${item.title} from ${label}`}
                  onClick={() => void handleRemove(item)}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : null}
          </li>
        ))}

        {Array.from({ length: emptySlots }, (_, i) => (
          <li
            key={`empty-${i}`}
            className="flex w-40 shrink-0 flex-col sm:w-auto"
          >
            <div className="shelf-bay">
              {isOwner ? (
                <Link
                  href={addHref}
                  aria-label={`Add to your ${label} shelf`}
                  className={`shelf-slot flex w-full ${aspect} items-center justify-center text-ink-muted`}
                >
                  <Plus aria-hidden="true" className="size-6" />
                </Link>
              ) : (
                <div aria-hidden="true" className={`shelf-slot w-full ${aspect}`} />
              )}
            </div>
            <div data-testid="shelf-plank" aria-hidden="true" className="shelf-plank" />
            <div aria-hidden="true" className="mt-3 h-5" />
            {isOwner ? <div aria-hidden="true" className="mt-2 h-11" /> : null}
          </li>
        ))}
      </ul>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`shelf-list-${shelfKey}`}
          className="btn"
        >
          {expanded ? "Show less" : `See all ${picks.length}`}
        </button>
      ) : null}
    </section>
  );
}
