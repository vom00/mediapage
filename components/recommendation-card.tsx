"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { MessageSquare, MessageSquareOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

const iconButtonClass =
  "flex size-11 items-center justify-center border border-edge text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink disabled:opacity-40";

function Timestamp({ at }: { at: { toDate(): Date } | null }) {
  return (
    <span className="font-label text-xs text-ink-muted">
      {formatRelativeTime(at ? at.toDate() : new Date())}
    </span>
  );
}

export function RecommendationCard({ rec }: { rec: RecommendationDoc }) {
  const { user, profile, status } = useAuth();
  const isAuthor = user?.uid === rec.uid;
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    );
  }, [rec.id, rec.commentsEnabled]);

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
    <article className="border border-edge bg-surface p-5 sm:p-6">
      <div className="flex gap-5">
        <div className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden border border-edge bg-surface-raised">
          <CoverImage
            src={rec.item.imageUrl}
            alt={`${rec.item.title} cover art`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl tracking-tight">
            {rec.item.title}
          </h3>
          <p className="mt-1 font-label text-xs text-ink-muted">
            {[rec.item.year, rec.item.subtitle].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 leading-relaxed text-ink">{rec.note}</p>
          <p className="mt-3 flex items-center gap-3 text-sm text-ink-muted">
            <Link
              href={`/u/${rec.author.handle}`}
              className="font-label transition-colors duration-200 hover:text-ink"
            >
              @{rec.author.handle}
            </Link>
            <Timestamp at={rec.createdAt} />
          </p>
        </div>

        {isAuthor ? (
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              className={iconButtonClass}
              aria-label={
                rec.commentsEnabled ? "Turn comments off" : "Turn comments on"
              }
              title={
                rec.commentsEnabled ? "Turn comments off" : "Turn comments on"
              }
              onClick={() =>
                void setRecommendationComments(db, rec.id, !rec.commentsEnabled)
              }
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
              onClick={() => void deleteRecommendation(db, rec.id)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>

      {rec.commentsEnabled ? (
        <div className="mt-5 border-t border-edge pt-4">
          {status === "ready" && profile ? (
            <form onSubmit={handleComment} className="flex flex-col gap-3">
              <label
                htmlFor={`comment-${rec.id}`}
                className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted"
              >
                Add a comment
              </label>
              <textarea
                id={`comment-${rec.id}`}
                required
                maxLength={500}
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full border border-edge bg-bg px-4 py-3 text-ink placeholder:text-ink-muted/60 transition-colors duration-200 focus:border-glow"
              />
              {error ? (
                <p role="alert" className="border-l-2 border-glow pl-3 text-sm">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={busy}
                className="liquid-glass flex min-h-11 w-fit items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
              >
                Post comment
              </button>
            </form>
          ) : status === "signedOut" ? (
            <p className="text-sm text-ink-muted">
              <Link href="/login" className="underline underline-offset-4 hover:text-ink">
                Log in to comment
              </Link>
            </p>
          ) : null}

          {comments.length > 0 ? (
            <ul className="mt-4 flex list-none flex-col gap-4 p-0">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-3">
                  <Avatar
                    src={comment.author.avatarUrl}
                    name={comment.author.displayName}
                    alt={`${comment.author.displayName}'s avatar`}
                    className="size-8 shrink-0 rounded-full border border-edge bg-surface-raised text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-3 text-sm text-ink-muted">
                      <span className="font-label">@{comment.author.handle}</span>
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
      ) : (
        <p className="mt-5 border-t border-edge pt-4 font-label text-xs uppercase tracking-[0.2em] text-ink-muted">
          Comments are off
        </p>
      )}
    </article>
  );
}
