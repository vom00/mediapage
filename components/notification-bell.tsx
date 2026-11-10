"use client";

import type { Timestamp } from "firebase/firestore";
import { Bell } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  const reduceMotion = useReducedMotion();

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
      className="btn btn-quiet relative min-w-11 px-0!"
    >
      <Bell aria-hidden="true" className="size-[18px]" />
      {unread > 0 ? (
        // Keyed on the count, so a new value ticks in from 6px below.
        <motion.span
          key={unread}
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-label text-[10px] font-medium leading-none text-accent-ink"
        >
          {unread > 9 ? "9+" : unread}
        </motion.span>
      ) : null}
    </Link>
  );
}
