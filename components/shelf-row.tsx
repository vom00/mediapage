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

const controlClass =
  "flex size-11 items-center justify-center border border-edge text-ink-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-glow hover:text-ink active:scale-[0.97] disabled:opacity-30 disabled:hover:border-edge motion-reduce:transition-none motion-reduce:active:scale-100";

export function ShelfRow({
  uid,
  shelfKey,
  label,
  isOwner,
  addHref,
  revealDelay = 0,
  mixed = false,
}: {
  uid: string;
  shelfKey: ShelfKey;
  label: string;
  isOwner: boolean;
  addHref: string;
  revealDelay?: number;
  // The watchlist holds mixed media, so each pick takes its own
  // category's shape rather than one shared aspect for the row.
  mixed?: boolean;
}) {
  const [picks, setPicks] = useState<MediaItem[]>([]);
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
      className="reveal border-t border-edge py-8"
      style={{ "--reveal-delay": `${revealDelay}ms` } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={`shelf-${shelfKey}`}
          className="font-display text-2xl tracking-tight"
        >
          {label}
        </h2>
        <div className="flex shrink-0 items-baseline gap-4">
          {isOwner ? (
            <Link
              href={addHref}
              aria-label={`Add to your ${label} shelf`}
              className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              + Add
            </Link>
          ) : null}
          <p className="font-label text-xs text-ink-muted">{picks.length}</p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-glow pl-3 text-sm">
          {error}
        </p>
      ) : null}

      <ul
        id={`shelf-list-${shelfKey}`}
        className="mt-6 flex list-none items-stretch overflow-x-auto p-0 pb-7 sm:grid sm:grid-cols-5 sm:overflow-visible"
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
            <div
              data-testid="shelf-case"
              ref={caseRef(item.id)}
              className={`shelf-case relative mx-2 w-full ${aspect}`}
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
            <div data-testid="shelf-plank" aria-hidden="true" className="shelf-plank" />
            <h3 className="mt-2 h-4 truncate px-1 text-center text-xs font-normal text-ink-muted">
              {item.title}
            </h3>
            {isOwner ? (
              <div className="mx-2 mt-2 flex gap-2">
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
                  className={`${controlClass} ml-auto`}
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
            {isOwner ? (
              <Link
                href={addHref}
                aria-label={`Add to your ${label} shelf`}
                className={`mx-2 flex w-full ${aspect} items-center justify-center border border-dashed border-edge text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink`}
              >
                <Plus aria-hidden="true" className="size-6" />
              </Link>
            ) : (
              <div
                aria-hidden="true"
                className={`mx-2 w-full ${aspect} border border-dashed border-edge/50`}
              />
            )}
            <div data-testid="shelf-plank" aria-hidden="true" className="shelf-plank" />
            <div aria-hidden="true" className="mt-2 h-4" />
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
          className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink"
        >
          {expanded ? "Show less" : `See all ${picks.length}`}
        </button>
      ) : null}
    </section>
  );
}
