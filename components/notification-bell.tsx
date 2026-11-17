"use client";

// Adapted from Rare UI (https://rareui.com), Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution.

import type { Timestamp } from "firebase/firestore";
import { Bell } from "lucide-react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { RollingNumber } from "@/components/rolling-number";
import { db } from "@/lib/firebase/client";
import {
  countUnread,
  watchNotifications,
  watchNotificationsSeenAt,
  type AppNotification,
} from "@/lib/notifications";

// Low damping so the bell keeps swinging for a moment, then settles.
const SWING = { type: "spring", stiffness: 300, damping: 14 } as const;
// Degrees per second of the strike.
const STRIKE = 220;

// Swings the bell when the unread count goes up. `ready` is false until both
// snapshots have landed, so the first load never rings.
function useBellRing(unread: number, ready: boolean, reduced: boolean) {
  const swing = useMotionValue(0);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = unread;
    if (before === null || unread <= before || reduced) return;
    animate(swing, 0, { ...SWING, velocity: STRIKE });
  }, [unread, ready, reduced, swing]);

  return swing;
}

// Nav bell with a live unread count. Unread = incoming follows (new
// followers + requests) newer than the last time this user opened
// /notifications, so the badge clears itself once they look.
export function NotificationBell() {
  const { user, status } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenAt, setSeenAt] = useState<Timestamp | null>(null);
  const [loaded, setLoaded] = useState({ notifications: false, seenAt: false });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!user) return;
    const unsubNotifs = watchNotifications(db, user.uid, (list) => {
      setNotifications(list);
      setLoaded((l) => ({ ...l, notifications: true }));
    });
    const unsubSeen = watchNotificationsSeenAt(db, user.uid, (at) => {
      setSeenAt(at);
      setLoaded((l) => ({ ...l, seenAt: true }));
    });
    return () => {
      unsubNotifs();
      unsubSeen();
      setLoaded({ notifications: false, seenAt: false });
    };
  }, [user]);

  const unread = countUnread(notifications, seenAt);
  const swing = useBellRing(
    unread,
    loaded.notifications && loaded.seenAt,
    reduceMotion ?? false,
  );

  if (status !== "ready" || !user) return null;

  const label =
    unread > 0 ? `Notifications, ${unread} new` : "Notifications";

  return (
    <Link
      href="/notifications"
      aria-label={label}
      className="btn btn-quiet relative min-w-11 px-0!"
    >
      {/* The bell hangs from its top, so it swings from there. */}
      <motion.span
        className="inline-flex"
        style={{ rotate: swing, transformOrigin: "50% 10%" }}
      >
        <Bell aria-hidden="true" className="size-[18px]" />
      </motion.span>
      {unread > 0 ? (
        <motion.span
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 font-label text-[10px] font-medium leading-none text-accent-ink"
        >
          {unread > 9 ? "9+" : <RollingNumber value={unread} />}
        </motion.span>
      ) : null}
    </Link>
  );
}
