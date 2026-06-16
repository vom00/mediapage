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

function Avatar({
  actor,
}: {
  actor: AppNotification["actor"];
}) {
  return (
    <UserAvatar
      src={actor.avatarUrl}
      name={actor.displayName}
      className="size-10 shrink-0 rounded-full border border-edge bg-surface-raised"
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
    setBusyUid(actorUid);
    try {
      if (approve) {
        await approveFollowRequest(db, actorUid, user.uid);
      } else {
        await declineFollowRequest(db, actorUid, user.uid);
      }
    } finally {
      setBusyUid(null);
    }
  }

  if (status === "loading" || (user && !loaded)) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-16 w-full" />
      </div>
    );
  }

  if (!user) return null;

  const requests = notifications.filter((n) => n.kind === "request");
  const followers = notifications.filter((n) => n.kind === "follower");

  if (notifications.length === 0) {
    return (
      <p className="text-ink-muted">
        No notifications yet. When someone follows you — or asks to — you&rsquo;ll
        see it here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {requests.length > 0 ? (
        <section aria-labelledby="requests-heading">
          <h2
            id="requests-heading"
            className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted"
          >
            Follow requests ({requests.length})
          </h2>
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {requests.map((req) => (
              <li
                key={req.actorUid}
                className="flex flex-wrap items-center gap-3 border-t border-edge pt-3 first:border-t-0 first:pt-0"
              >
                <Link
                  href={`/u/${req.actor.handle}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar actor={req.actor} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {req.actor.displayName}
                    </span>
                    <span className="block truncate font-label text-xs text-ink-muted">
                      @{req.actor.handle} · wants to follow you
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void respond(req.actorUid, true)}
                    disabled={busyUid === req.actorUid}
                    className="liquid-glass flex min-h-9 items-center rounded-full px-4 text-sm text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(req.actorUid, false)}
                    disabled={busyUid === req.actorUid}
                    aria-label={`Decline follow request from @${req.actor.handle}`}
                    className="flex min-h-9 items-center rounded-full border border-edge px-4 text-sm text-ink-muted transition-colors duration-200 hover:border-glow hover:text-ink disabled:opacity-50"
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
          <h2
            id="followers-heading"
            className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted"
          >
            New followers
          </h2>
          <ul className="mt-4 flex list-none flex-col p-0">
            {followers.map((f) => (
              <li
                key={f.actorUid}
                className="border-t border-edge last:border-b"
              >
                <Link
                  href={`/u/${f.actor.handle}`}
                  className="flex items-center gap-3 py-4 transition-colors duration-200 hover:bg-surface"
                >
                  <Avatar actor={f.actor} />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm text-ink">
                      <span className="font-medium">{f.actor.displayName}</span>{" "}
                      <span className="text-ink-muted">started following you</span>
                    </span>
                    <span className="mt-0.5 block font-label text-xs text-ink-muted">
                      @{f.actor.handle} · {when(f.createdAt)}
                    </span>
                  </span>
                  {isUnread(f, prevSeenAt) ? (
                    <span className="shrink-0 rounded-full border border-glow px-2 py-0.5 font-label text-[10px] uppercase tracking-wide text-ink">
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
