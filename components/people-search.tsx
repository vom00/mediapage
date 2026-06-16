"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { useAuth } from "@/components/auth-provider";
import { FollowButton } from "@/components/follow-button";
import { db } from "@/lib/firebase/client";
import { searchProfiles } from "@/lib/people";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export function PeopleSearch() {
  const { user } = useAuth();
  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery.trim(), 300);

  const { data, status } = useQuery({
    queryKey: ["people-search", query, user?.uid ?? "anon"],
    queryFn: () => searchProfiles(db, query, { excludeUid: user?.uid }),
    enabled: query.length > 0,
  });

  const people = data ?? [];
  const searching = query.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label
          htmlFor="people-query"
          className="block font-label text-xs uppercase tracking-[0.2em] text-ink-muted"
        >
          Search for people
        </label>
        <input
          id="people-query"
          type="search"
          placeholder="A handle, like @cinemaven"
          autoComplete="off"
          spellCheck={false}
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          className="mt-2 w-full min-h-11 max-w-xl border border-edge bg-bg px-4 py-2 text-ink placeholder:text-ink-muted/60 transition-colors duration-200 focus:border-glow"
        />
        <p className="mt-2 text-xs text-ink-muted">
          Find people by the start of their handle.
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {searching && status === "success"
          ? `${people.length} people found`
          : ""}
      </div>

      {!searching ? (
        <p className="max-w-md text-ink-muted">
          Type a handle to find other readers, watchers, and listeners.
        </p>
      ) : status === "pending" ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          <div className="skeleton h-16 w-full max-w-xl" />
          <div className="skeleton h-16 w-full max-w-xl" />
        </div>
      ) : people.length === 0 ? (
        <p className="max-w-md text-ink-muted">
          No one by that handle yet. Try a different start.
        </p>
      ) : (
        <ul className="flex max-w-xl list-none flex-col p-0">
          {people.map((person) => (
            <li
              key={person.uid}
              className="flex items-center gap-4 border-t border-edge py-4 last:border-b"
            >
              <Link
                href={`/u/${person.handle}`}
                className="flex min-w-0 flex-1 items-center gap-4"
              >
                <Avatar
                  src={person.avatarUrl}
                  name={person.displayName}
                  className="size-11 shrink-0 rounded-full border border-edge bg-surface"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {person.displayName}
                  </span>
                  <span className="block truncate font-label text-sm text-ink-muted">
                    @{person.handle}
                  </span>
                </span>
              </Link>
              <FollowButton
                targetUid={person.uid}
                targetIsPublic={true}
                variant="glass"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
