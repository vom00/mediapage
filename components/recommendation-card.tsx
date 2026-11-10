"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { MessageSquare, MessageSquareOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { CoverImage } from "@/components/cover-image";
import { db } from "@/lib/firebase/client";
import {
  addComment,
  deleteComment,
  deleteRecommendation,
  setRecommendationComments,
  type CommentDoc,
  type RecommendationDoc,
} from "@/lib/recommendations";
import { formatRelativeTime } from "@/lib/relative-time";
import { useAvatarUrl } from "@/lib/use-avatar";

// Quiet icon buttons with 44px targets.
const iconButtonClass = "btn btn-quiet size-11 shrink-0 px-0";

function Timestamp({ at }: { at: { toDate(): Date } | null }) {
  return (
    <span className="font-label text-xs text-ink-muted">
      {formatRelativeTime(at ? at.toDate() : new Date())}
    </span>
  );
}

// The comment stamp omits data-URL avatars, so hydrate the commenter's
// picture from their live profile.
function CommentAvatar({ comment }: { comment: CommentDoc }) {
  const src = useAvatarUrl(comment.uid, comment.author.avatarUrl);
  return (
    <Avatar
      src={src}
      name={comment.author.displayName}
      alt={`${comment.author.displayName}'s avatar`}
      className="size-8 shrink-0 rounded-full border border-edge bg-surface-raised text-sm"
    />
  );
}

// The recommender's small picture beside the byline; decorative (the
// handle link next to it carries the name).
function ByAvatar({ rec }: { rec: RecommendationDoc }) {
  const src = useAvatarUrl(rec.uid, rec.author.avatarUrl);
  return (
    <Avatar
      src={src}
      name={rec.author.displayName}
      className="size-6 shrink-0 rounded-full border border-edge bg-surface-raised text-xs"
    />
  );
}

export function RecommendationCard({ rec }: { rec: RecommendationDoc }) {
  const { user, profile, status } = useAuth();
  const isAuthor = user?.uid === rec.uid;
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!rec.commentsEnabled) return;
    return onSnapshot(
      query(
        collection(db, "recommendations", rec.id, "comments"),
        orderBy("createdAt", "desc"),
      ),
      (snap) => {
        setComments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentDoc),
        );
      },
      () => setComments([]),
    );
  }, [rec.id, rec.commentsEnabled]);

  async function handleToggleComments() {
    setActionError(null);
    try {
      await setRecommendationComments(db, rec.id, !rec.commentsEnabled);
    } catch {
      setActionError("That didn't save. Try again in a moment.");
    }
  }

  async function handleDelete() {
    setActionError(null);
    setDeleting(true);
    try {
      await deleteRecommendation(db, rec.id);
      confirmRef.current?.close();
    } catch {
      setActionError("Deleting didn't go through. Try again in a moment.");
      confirmRef.current?.close();
    } finally {
      setDeleting(false);
    }
  }

  async function handleComment(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    setError(null);
    setBusy(true);
    try {
      await addComment(
        db,
        {
          uid: user.uid,
          handle: profile.handle,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        },
        rec.id,
        body,
      );
      setBody("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card p-6 sm:p-8">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-5 sm:gap-x-8">
        <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md border border-edge bg-surface-raised sm:row-span-3 sm:w-28">
          <CoverImage
            src={rec.item.imageUrl}
            alt={`${rec.item.title} cover art`}
          />
        </div>
        <div className="min-w-0 self-end sm:self-start">
          <h3 className="text-xl font-medium leading-tight sm:text-2xl">
            {rec.item.title}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {[rec.item.year, rec.item.subtitle].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="col-span-2 text-pretty [overflow-wrap:anywhere] text-lg leading-relaxed text-ink sm:col-span-1 sm:col-start-2 sm:text-xl">
          {rec.note}
        </p>
        <p className="col-span-2 flex items-center gap-2.5 text-sm text-ink-muted sm:col-span-1 sm:col-start-2">
          <ByAvatar rec={rec} />
          <Link
            href={`/u/${rec.author.handle}`}
            className="link text-ink"
          >
            @{rec.author.handle}
          </Link>
          <Timestamp at={rec.createdAt} />
        </p>
      </div>

      {actionError ? (
        <p role="alert" className="mt-4 border-l-2 border-danger pl-3 text-sm">
          {actionError}
        </p>
      ) : null}

      <div className="mt-6 border-t border-edge pt-4">
        {isAuthor || !rec.commentsEnabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {rec.commentsEnabled ? (
              <span aria-hidden="true" />
            ) : (
              <p className="text-sm text-ink-muted">
                Comments are off
              </p>
            )}
            {isAuthor ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={
                    rec.commentsEnabled ? "Turn comments off" : "Turn comments on"
                  }
                  title={
                    rec.commentsEnabled ? "Turn comments off" : "Turn comments on"
                  }
                  onClick={() => void handleToggleComments()}
                >
                  {rec.commentsEnabled ? (
                    <MessageSquareOff aria-hidden="true" className="size-4" />
                  ) : (
                    <MessageSquare aria-hidden="true" className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  className={iconButtonClass}
                  aria-label={`Delete recommendation of ${rec.item.title}`}
                  onClick={() => confirmRef.current?.showModal()}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
                <dialog
                  ref={confirmRef}
                  aria-labelledby={`confirm-delete-${rec.id}`}
                  className="card m-auto w-[min(92vw,26rem)] bg-surface-raised p-7 text-ink backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
                >
                  <h4
                    id={`confirm-delete-${rec.id}`}
                    className="text-2xl font-medium"
                  >
                    Delete this recommendation?
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                    {rec.item.title} comes off your page, along with its
                    comments. This can&rsquo;t be undone.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="btn btn-primary"
                    >
                      Yes, delete
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmRef.current?.close()}
                      className="btn btn-quiet"
                    >
                      Cancel
                    </button>
                  </div>
                </dialog>
              </div>
            ) : null}
          </div>
        ) : null}

        {rec.commentsEnabled ? (
          <div className={isAuthor ? "mt-5" : ""}>
            {status === "ready" && profile ? (
              <form onSubmit={handleComment} className="flex flex-col gap-3">
                <label htmlFor={`comment-${rec.id}`} className="text-sm font-medium">
                  Add a comment
                </label>
                <textarea
                  id={`comment-${rec.id}`}
                  required
                  maxLength={500}
                  rows={2}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="field"
                />
                {error ? (
                  <p role="alert" className="border-l-2 border-danger pl-3 text-sm">
                    {error}
                  </p>
                ) : null}
                <button type="submit" disabled={busy} className="btn w-fit">
                  Post comment
                </button>
              </form>
            ) : status === "signedOut" ? (
              <p className="text-sm text-ink-muted">
                <Link
                  href="/login"
                  className="link"
                >
                  Log in to comment
                </Link>
              </p>
            ) : null}

            {comments.length > 0 ? (
              <ul className="mt-5 flex list-none flex-col gap-4 p-0">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex items-start gap-3">
                    <CommentAvatar comment={comment} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-3 text-sm text-ink-muted">
                        <span>@{comment.author.handle}</span>
                        <Timestamp at={comment.createdAt} />
                      </p>
                      <p className="mt-1 text-ink">{comment.body}</p>
                    </div>
                    {user && (user.uid === comment.uid || isAuthor) ? (
                      <button
                        type="button"
                        className={iconButtonClass}
                        aria-label={`Delete comment by @${comment.author.handle}`}
                        onClick={() => void deleteComment(db, rec.id, comment.id)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
