"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CoverImage } from "@/components/cover-image";
import { FieldError, labelClass } from "@/components/form-field";
import { CATEGORY_LABELS, SOURCE_NAMES } from "@/lib/categories";
import { db } from "@/lib/firebase/client";
import { postRecommendation } from "@/lib/recommendations";
import { addPick, WATCHLIST } from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";

type AddState = "idle" | "busy" | "added";
type RecState = "closed" | "open" | "busy" | "posted";

export function MediaDetailDialog({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { user, profile, status } = useAuth();
  const [addState, setAddState] = useState<AddState>("idle");
  const [watchState, setWatchState] = useState<AddState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recState, setRecState] = useState<RecState>("closed");
  const [note, setNote] = useState("");
  const [allowComments, setAllowComments] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  // Reset transient state whenever a different item opens.
  const [prevItem, setPrevItem] = useState(item);
  if (item !== prevItem) {
    setPrevItem(item);
    setAddState("idle");
    setWatchState("idle");
    setError(null);
    setRecState("closed");
    setNote("");
    setAllowComments(profile?.defaultCommentsOn ?? false);
    setRecError(null);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  async function handleAdd() {
    if (!user || !item) return;
    setError(null);
    setAddState("busy");
    try {
      await addPick(db, user.uid, item);
      setAddState("added");
    } catch (err) {
      setAddState("idle");
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    }
  }

  async function handleAddWatchlist() {
    if (!user || !item) return;
    setError(null);
    setWatchState("busy");
    try {
      await addPick(db, user.uid, item, WATCHLIST);
      setWatchState("added");
    } catch (err) {
      setWatchState("idle");
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    }
  }

  async function handleRecommend(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !profile || !item) return;
    setRecError(null);
    setRecState("busy");
    try {
      await postRecommendation(
        db,
        {
          uid: user.uid,
          handle: profile.handle,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
        item,
        note,
        allowComments,
      );
      setRecState("posted");
    } catch (err) {
      setRecState("open");
      setRecError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    }
  }

  const shelfLabel = item ? CATEGORY_LABELS[item.category] : "";
  const meta = item
    ? [item.year, item.subtitle, item.genres?.slice(0, 3).join(", ")]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="detail-title"
      className="m-auto w-[min(92vw,44rem)] border border-edge bg-surface-raised p-0 text-ink backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      {item ? (
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex size-11 items-center justify-center border border-edge text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink"
          >
            <X aria-hidden="true" className="size-4" />
          </button>

          <div className="relative aspect-[2/3] w-40 shrink-0 self-start overflow-hidden border border-edge bg-surface sm:w-52">
            <CoverImage
              src={item.imageUrl}
              alt={`${item.title} cover art, enlarged`}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-4 pr-8">
            <div>
              <p className="font-label text-xs uppercase tracking-[0.25em] text-ink-muted">
                {shelfLabel}
              </p>
              <h2
                id="detail-title"
                className="mt-2 font-display text-3xl leading-tight tracking-tight"
              >
                {item.title}
              </h2>
              {meta ? <p className="mt-2 text-sm text-ink-muted">{meta}</p> : null}
            </div>

            {item.synopsis ? (
              <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-ink-muted">
                {item.synopsis}
              </p>
            ) : null}

            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
              >
                View on {SOURCE_NAMES[item.source]}
              </a>
            ) : null}

            <div className="mt-auto flex flex-col gap-3">
              {error ? (
                <div role="alert">
                  <FieldError id="add-error" message={error} />
                </div>
              ) : null}

              {addState === "added" ? (
                <p className="border-l-2 border-glow pl-3 text-sm">
                  Added to your {shelfLabel} shelf.
                </p>
              ) : status === "ready" ? (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addState === "busy"}
                  className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 font-medium text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
                >
                  Add to my {shelfLabel} shelf
                </button>
              ) : (
                <Link
                  href="/login"
                  className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90"
                >
                  Log in to add this to your shelf
                </Link>
              )}

              {status === "ready" ? (
                watchState === "added" ? (
                  <p className="border-l-2 border-glow pl-3 text-sm">
                    Added to your watchlist.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddWatchlist}
                    disabled={watchState === "busy"}
                    className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    Add to watchlist
                  </button>
                )
              ) : null}

              {status === "ready" && recState === "closed" ? (
                <button
                  type="button"
                  onClick={() => setRecState("open")}
                  className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90"
                >
                  Recommend it
                </button>
              ) : null}

              {recState === "posted" ? (
                <p className="border-l-2 border-glow pl-3 text-sm">
                  Recommendation posted. It is live on your page.
                </p>
              ) : null}

              {recState === "open" || recState === "busy" ? (
                <form
                  onSubmit={handleRecommend}
                  className="flex flex-col gap-3 border-t border-edge pt-4"
                >
                  <div>
                    <label htmlFor="rec-note" className={labelClass}>
                      Why this one?
                    </label>
                    <textarea
                      id="rec-note"
                      required
                      maxLength={500}
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-2 w-full border border-edge bg-bg px-4 py-3 text-ink placeholder:text-ink-muted/60 transition-colors duration-200 focus:border-glow"
                      placeholder="The pitch only you could write."
                    />
                  </div>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-muted">
                    <input
                      type="checkbox"
                      checked={allowComments}
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="size-4 accent-ink"
                    />
                    Allow comments
                  </label>
                  <p className="text-xs text-ink-muted">
                    Recommendations are public. Anyone can see this and your
                    name on it, even if your profile is followers-only.
                  </p>
                  {recError ? (
                    <div role="alert">
                      <FieldError id="rec-error" message={recError} />
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={recState === "busy"}
                    className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 font-medium text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    Post recommendation
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
