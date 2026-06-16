"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShelfPiece } from "@/components/shelf-piece";
import { CATEGORY_LABELS } from "@/lib/categories";
import { db } from "@/lib/firebase/client";
import { PIECE_ASPECT } from "@/lib/shelf-piece";
import { movePick, removePick, setShelfPicks, SHELF_MAX } from "@/lib/shelves";
import type { MediaCategory, MediaItem } from "@/lib/types";
import { useShelfMotion } from "@/lib/use-shelf-motion";

const controlClass =
  "flex size-11 items-center justify-center border border-edge text-ink-muted transition-[color,border-color,transform] duration-150 ease-out hover:border-glow hover:text-ink active:scale-[0.97] disabled:opacity-30 disabled:hover:border-edge motion-reduce:transition-none motion-reduce:active:scale-100";

export function ShelfRow({
  uid,
  category,
  isOwner,
  revealDelay = 0,
}: {
  uid: string;
  category: MediaCategory;
  isOwner: boolean;
  revealDelay?: number;
}) {
  const label = CATEGORY_LABELS[category];
  const [picks, setPicks] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dragFrom = useRef<number | null>(null);
  const caseRef = useShelfMotion(picks.map((p) => p.id).join("|"));

  useEffect(() => {
    return onSnapshot(doc(db, "users", uid, "shelves", category), (snap) => {
      setPicks(
        snap.exists() ? ((snap.data() as { picks?: MediaItem[] }).picks ?? []) : [],
      );
    });
  }, [uid, category]);

  async function persist(next: MediaItem[]) {
    setError(null);
    const previous = picks;
    setPicks(next);
    try {
      await setShelfPicks(db, uid, category, next);
    } catch {
      setPicks(previous);
      setError("That change didn't save. Try again.");
    }
  }

  async function handleRemove(item: MediaItem) {
    setError(null);
    try {
      await removePick(db, uid, category, item.id);
    } catch {
      setError("That change didn't save. Try again.");
    }
  }

  const emptySlots = Math.max(0, SHELF_MAX - picks.length);
  const aspect = PIECE_ASPECT[category];

  return (
    <section
      aria-labelledby={`shelf-${category}`}
      className="reveal border-t border-edge py-8"
      style={{ "--reveal-delay": `${revealDelay}ms` } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between">
        <h2
          id={`shelf-${category}`}
          className="font-display text-2xl tracking-tight"
        >
          {label}
        </h2>
        <p className="font-label text-xs text-ink-muted">
          {picks.length} / {SHELF_MAX}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-glow pl-3 text-sm">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 flex list-none items-stretch overflow-x-auto p-0 pb-7 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {picks.map((item, index) => (
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
              <ShelfPiece item={item} />
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
                href={`/library?category=${category}`}
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
    </section>
  );
}
