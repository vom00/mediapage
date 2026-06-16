"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { db } from "@/lib/firebase/client";
import { fetchFollowers, fetchFollowing } from "@/lib/follows";
import { resolveHandle } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";

export function FollowList({
  handle,
  kind,
}: {
  handle: string;
  kind: "followers" | "following";
}) {
  const [people, setPeople] = useState<UserProfile[] | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const uid = await resolveHandle(db, handle);
      if (cancelled) return;
      if (!uid) {
        setNotFound(true);
        return;
      }
      const list =
        kind === "followers"
          ? await fetchFollowers(db, uid)
          : await fetchFollowing(db, uid);
      if (!cancelled) setPeople(list);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [handle, kind]);

  const title = kind === "followers" ? "Followers" : "Following";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14 sm:py-20">
      <p className="reveal font-label text-xs uppercase tracking-[0.3em] text-ink-muted">
        <Link href={`/u/${handle}`} className="hover:text-ink">
          @{handle}
        </Link>
      </p>
      <h1 className="reveal mt-3 font-display text-4xl tracking-tight">
        {title}
      </h1>

      {notFound ? (
        <p className="mt-8 text-ink-muted">Nobody has claimed @{handle} yet.</p>
      ) : people === null ? (
        <div aria-hidden="true" className="mt-8 flex flex-col gap-3">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : people.length === 0 ? (
        <p className="mt-8 text-ink-muted">
          {kind === "followers"
            ? "No followers yet."
            : "Not following anyone yet."}
        </p>
      ) : (
        <ul className="mt-8 flex list-none flex-col p-0">
          {people.map((person) => (
            <li key={person.uid} className="border-t border-edge last:border-b">
              <Link
                href={`/u/${person.handle}`}
                className="flex min-h-11 items-center gap-4 py-4 transition-colors duration-200 hover:bg-surface"
              >
                <Avatar
                  src={person.avatarUrl}
                  name={person.displayName}
                  className="size-10 shrink-0 rounded-full border border-edge bg-surface"
                />
                <span className="font-medium text-ink">
                  {person.displayName}
                </span>
                <span className="font-label text-sm text-ink-muted">
                  @{person.handle}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
