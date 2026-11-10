"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { FollowButton } from "@/components/follow-button";
import { db } from "@/lib/firebase/client";
import { fetchFollowers, fetchFollowing } from "@/lib/follows";
import { resolveHandle } from "@/lib/profile";
import type { UserProfile } from "@/lib/types";

// One row design for every list of people: avatar, name, handle,
// follow button. The row has a fixed minimum height that the skeleton
// shares, so loading never shifts the page.
export const PERSON_ROW_HEIGHT = "min-h-[4.5rem]";

export function PersonRow({ person }: { person: UserProfile }) {
  return (
    <li
      className={`flex items-center gap-4 border-b border-edge py-3 ${PERSON_ROW_HEIGHT}`}
    >
      <Link
        href={`/u/${person.handle}`}
        className="-mx-3 flex min-w-0 flex-1 items-center gap-4 rounded-[var(--radius-sm)] px-3 py-2 transition-colors duration-150 hover:bg-surface"
      >
        <Avatar
          src={person.avatarUrl}
          name={person.displayName}
          className="size-12 shrink-0 rounded-full border border-edge bg-surface-raised text-lg"
        />
        <span className="min-w-0">
          <span className="block truncate text-base font-medium tracking-tight text-ink">
            {person.displayName}
          </span>
          <span className="block truncate font-label text-xs text-ink-muted">
            @{person.handle}
          </span>
        </span>
      </Link>
      <FollowButton targetUid={person.uid} targetIsPublic={person.isPublic} />
    </li>
  );
}

export function PersonRowSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col border-t border-edge">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`flex items-center border-b border-edge py-3 ${PERSON_ROW_HEIGHT}`}
        >
          <div className="skeleton h-full min-h-12 w-full rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  );
}

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
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-20">
      <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl">
        <span className="enter-line">
          <span>{title}</span>
        </span>
      </h1>
      <p
        className="enter-up mt-3 text-sm text-ink-muted"
        style={{ "--enter-i": 0 } as React.CSSProperties}
      >
        <Link href={`/u/${handle}`} className="link text-ink-muted">
          @{handle}
        </Link>
      </p>

      <div
        className="enter-up mt-8 max-w-3xl sm:mt-12"
        style={{ "--enter-i": 1 } as React.CSSProperties}
      >
        {notFound ? (
          <p className="text-ink-muted">Nobody has claimed @{handle} yet.</p>
        ) : people === null ? (
          <PersonRowSkeletons />
        ) : people.length === 0 ? (
          <p className="text-ink-muted">
            {kind === "followers"
              ? "No followers yet."
              : "Not following anyone yet."}
          </p>
        ) : (
          <ul className="flex list-none flex-col border-t border-edge p-0">
            {people.map((person) => (
              <PersonRow key={person.uid} person={person} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
