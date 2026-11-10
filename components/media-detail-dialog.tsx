"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CoverImage } from "@/components/cover-image";
import { FieldError } from "@/components/form-field";
import { shelfStyle } from "@/components/media-card";
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
      style={item ? shelfStyle(item.category) : undefined}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,46rem)] overflow-y-auto rounded-[var(--radius-lg)] border border-edge bg-surface p-0 text-ink backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      {item ? (
        <div>
          <div className="flex items-center justify-between gap-4 px-5 pt-3 sm:px-8 sm:pt-5">
            <p className="flex items-center gap-2.5 text-sm text-ink-muted">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-(--shelf)"
              />
              {shelfLabel}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn size-11 min-h-0 p-0 text-ink-muted hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-[6.5rem_1fr] grid-rows-[auto_auto_1fr] gap-x-5 px-5 pb-6 pt-2 sm:grid-cols-[13rem_1fr] sm:gap-x-8 sm:px-8 sm:pb-8">
            <div className="relative aspect-[2/3] w-full self-start overflow-hidden rounded-[var(--radius-md)] border border-edge bg-surface-raised sm:row-span-3">
              <CoverImage
                src={item.imageUrl}
                alt={`${item.title} cover art, enlarged`}
              />
            </div>

            <div className="min-w-0 self-end sm:self-start">
              <h2
                id="detail-title"
                className="text-2xl font-medium leading-[1.1] tracking-[-0.035em] text-balance sm:text-4xl"
              >
                {item.title}
              </h2>
              {meta ? (
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  {meta}
                </p>
              ) : null}
            </div>

            <div className="col-span-2 mt-6 flex min-w-0 flex-col gap-5 sm:col-span-1">
              {item.synopsis ? (
                <p className="max-h-40 overflow-y-auto leading-relaxed text-ink-muted">
                  {item.synopsis}
                </p>
              ) : null}

              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
                >
                  View on {SOURCE_NAMES[item.source]}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              ) : null}

              <div className="flex flex-col gap-4 border-t border-edge pt-5">
                {error ? (
                  <div role="alert">
                    <FieldError id="add-error" message={error} />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <Swap
                    swapKey={addState === "added" ? "added" : "add"}
                    className={addState === "added" ? "" : "w-full"}
                  >
                    {addState === "added" ? (
                      <Confirmation>Added to your {shelfLabel} shelf.</Confirmation>
                    ) : status === "ready" ? (
                      <button
                        type="button"
                        onClick={handleAdd}
                        disabled={addState === "busy"}
                        className="btn btn-primary w-full"
                      >
                        Add to my {shelfLabel} shelf
                      </button>
                    ) : (
                      <Link href="/login" className="btn btn-primary w-full">
                        Log in to add this to your shelf
                      </Link>
                    )}
                  </Swap>

                  {status === "ready" ? (
                    <Swap swapKey={watchState === "added" ? "added" : "add"}>
                      {watchState === "added" ? (
                        <Confirmation>Added to your watchlist.</Confirmation>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddWatchlist}
                          disabled={watchState === "busy"}
                          className="btn"
                        >
                          Add to watchlist
                        </button>
                      )}
                    </Swap>
                  ) : null}

                  {status === "ready" && recState === "closed" ? (
                    <button
                      type="button"
                      onClick={() => setRecState("open")}
                      className="btn"
                    >
                      Recommend it
                    </button>
                  ) : null}
                </div>

                {recState === "posted" ? (
                  <Swap swapKey="posted">
                    <Confirmation>
                      Recommendation posted. It is live on your page.
                    </Confirmation>
                  </Swap>
                ) : null}

                {recState === "open" || recState === "busy" ? (
                  <form
                    onSubmit={handleRecommend}
                    className="mt-2 flex flex-col gap-4"
                  >
                    <div>
                      <label htmlFor="rec-note" className="block text-sm font-medium">
                        Why this one?
                      </label>
                      <textarea
                        id="rec-note"
                        required
                        maxLength={500}
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="field mt-2 text-base leading-snug"
                        placeholder="The pitch only you could write."
                      />
                      <p
                        aria-hidden="true"
                        className="mt-1.5 text-right font-label text-xs text-ink-muted"
                      >
                        {note.length} / 500
                      </p>
                    </div>
                    <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm text-ink-muted">
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="size-5 accent-accent"
                      />
                      Allow comments
                    </label>
                    <p className="text-xs leading-relaxed text-ink-muted">
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
                      className="btn btn-primary w-fit"
                    >
                      Post recommendation
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

// Swaps what it holds in place: the new content fades in over 150ms.
function Swap({
  swapKey,
  className,
  children,
}: {
  swapKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      key={swapKey}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Confirmation({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex min-h-11 items-center gap-2.5 text-sm text-ink"
    >
      <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />
      {children}
    </p>
  );
}
