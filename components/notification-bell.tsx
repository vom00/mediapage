"use client";

import type { Timestamp } from "firebase/firestore";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/client";
import {
  countUnread,
  watchNotifications,
  watchNotificationsSeenAt,
  type AppNotification,
} from "@/lib/notifications";

// Nav bell with a live unread count. Unread = incoming follows (new
// followers + requests) newer than the last time this user opened
// /notifications, so the badge clears itself once they look.
export function NotificationBell() {
  const { user, status } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenAt, setSeenAt] = useState<Timestamp | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubNotifs = watchNotifications(db, user.uid, setNotifications);
    const unsubSeen = watchNotificationsSeenAt(db, user.uid, setSeenAt);
    return () => {
      unsubNotifs();
      unsubSeen();
    };
  }, [user]);

  if (status !== "ready" || !user) return null;

  const unread = countUnread(notifications, seenAt);
  const label =
    unread > 0 ? `Notifications, ${unread} new` : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="relative flex min-h-11 min-w-11 items-center justify-center border border-edge text-ink transition-colors duration-200 hover:border-glow"
    >
      <Bell aria-hidden="true" className="size-4" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 font-label text-[10px] font-medium leading-none text-bg"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
