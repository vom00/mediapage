"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PersonRow, PersonRowSkeletons } from "@/components/follow-list";
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
    <div className="flex max-w-3xl flex-col gap-10">
      <div
        className="enter-up max-w-2xl"
        style={{ "--enter-i": 1 } as React.CSSProperties}
      >
        <label
          htmlFor="people-query"
          className="block text-sm font-medium text-ink"
        >
          Search for people
        </label>
        <div className="relative mt-3">
          <Search
            aria-hidden="true"
            strokeWidth={1.75}
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="people-query"
            type="search"
            placeholder="A handle, like @cinemaven"
            autoComplete="off"
            spellCheck={false}
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="field min-h-14 pl-12 text-lg [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
        <p className="mt-3 text-sm text-ink-muted">
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
        <PersonRowSkeletons count={2} />
      ) : people.length === 0 ? (
        <p className="max-w-md text-ink-muted">
          No one by that handle yet. Try a different start.
        </p>
      ) : (
        <ul className="flex list-none flex-col border-t border-edge p-0">
          {people.map((person) => (
            <PersonRow key={person.uid} person={person} />
          ))}
        </ul>
      )}
    </div>
  );
}
