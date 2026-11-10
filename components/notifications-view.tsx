"use client";

import type { Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar as UserAvatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/client";
import { approveFollowRequest, declineFollowRequest } from "@/lib/follows";
import {
  fetchNotificationsSeenAt,
  isUnread,
  markNotificationsSeen,
  watchNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/relative-time";
import { useAvatarUrl } from "@/lib/use-avatar";

// The follow-edge stamp omits data-URL avatars, so hydrate the actor's
// picture from their live profile (falling back to initials if it is
// private and unreadable).
function Avatar({
  actorUid,
  actor,
}: {
  actorUid: string;
  actor: AppNotification["actor"];
}) {
  const src = useAvatarUrl(actorUid, actor.avatarUrl);
  return (
    <UserAvatar
      src={src}
      name={actor.displayName}
      className="size-12 shrink-0 rounded-full border border-edge bg-surface-raised text-lg"
    />
  );
}

function when(createdAt: Timestamp | null): string {
  return formatRelativeTime(createdAt ? createdAt.toDate() : new Date());
}

export function NotificationsView() {
  const { user, status } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  // The stamp from the *previous* visit, captured before we mark this
  // visit seen — drives the "New" highlight.
  const [prevSeenAt, setPrevSeenAt] = useState<Timestamp | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return;
    return watchNotifications(db, user.uid, (next) => {
      setNotifications(next);
      setLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    void (async () => {
      setPrevSeenAt(await fetchNotificationsSeenAt(db, user.uid));
      await markNotificationsSeen(db, user.uid);
    })();
  }, [user]);

  async function respond(actorUid: string, approve: boolean) {
    if (!user) return;
    setError(null);
    setBusyUid(actorUid);
    try {
      if (approve) {
        await approveFollowRequest(db, actorUid, user.uid);
      } else {
        await declineFollowRequest(db, actorUid, user.uid);
      }
    } catch {
      setError("That didn't go through. Try again in a moment.");
    } finally {
      setBusyUid(null);
    }
  }

  if (status === "loading" || (user && !loaded)) {
    return (
      <div aria-hidden="true" className="flex flex-col border-t border-edge">
        <div className="border-b border-edge py-3">
          <div className="skeleton min-h-12 rounded-[var(--radius-sm)]" />
        </div>
        <div className="border-b border-edge py-3">
          <div className="skeleton min-h-12 rounded-[var(--radius-sm)]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const requests = notifications.filter((n) => n.kind === "request");
  const followers = notifications.filter((n) => n.kind === "follower");

  if (notifications.length === 0) {
    return (
      <p className="max-w-md text-ink-muted">
        No notifications yet. When someone follows you — or asks to — you&rsquo;ll
        see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {error ? (
        <p role="alert" className="border-l-2 border-danger pl-3 text-sm">
          {error}
        </p>
      ) : null}
      {requests.length > 0 ? (
        <section aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="text-lg font-medium">
            Follow requests ({requests.length})
          </h2>
          <ul className="mt-4 flex list-none flex-col border-t border-edge p-0">
            {requests.map((req) => (
              <li
                key={req.actorUid}
                className="flex min-h-[4.5rem] flex-wrap items-center gap-x-4 gap-y-3 border-b border-edge py-3"
              >
                <Link
                  href={`/u/${req.actor.handle}`}
                  className="flex min-w-0 flex-[1_1_100%] items-center gap-4 sm:flex-[1_1_0%]"
                >
                  <Avatar actorUid={req.actorUid} actor={req.actor} />
                  <span className="min-w-0">
                    <span className="block truncate text-base font-medium tracking-tight text-ink">
                      {req.actor.displayName}
                    </span>
                    <span className="block truncate font-label text-xs text-ink-muted">
                      @{req.actor.handle} · wants to follow you
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => void respond(req.actorUid, true)}
                    disabled={busyUid === req.actorUid}
                    className="btn btn-primary"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(req.actorUid, false)}
                    disabled={busyUid === req.actorUid}
                    aria-label={`Decline follow request from @${req.actor.handle}`}
                    className="btn btn-quiet"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {followers.length > 0 ? (
        <section aria-labelledby="followers-heading">
          <h2 id="followers-heading" className="text-lg font-medium">
            New followers
          </h2>
          <ul className="mt-4 flex list-none flex-col border-t border-edge p-0">
            {followers.map((f) => (
              <li
                key={f.actorUid}
                className="border-b border-edge"
              >
                <Link
                  href={`/u/${f.actor.handle}`}
                  className="-mx-3 flex min-h-[4.5rem] items-center gap-4 rounded-[var(--radius-sm)] px-3 py-3 transition-colors duration-150 hover:bg-surface"
                >
                  <Avatar actorUid={f.actorUid} actor={f.actor} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-ink">
                      <span className="font-medium tracking-tight">
                        {f.actor.displayName}
                      </span>{" "}
                      <span className="text-ink-muted">started following you</span>
                    </span>
                    <span className="mt-0.5 block font-label text-xs text-ink-muted">
                      @{f.actor.handle} · {when(f.createdAt)}
                    </span>
                  </span>
                  {isUnread(f, prevSeenAt) ? (
                    <span className="shrink-0 text-sm font-medium text-accent">
                      New
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
