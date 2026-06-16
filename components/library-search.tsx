"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MediaCard } from "@/components/media-card";
import { MediaDetailDialog } from "@/components/media-detail-dialog";
import type { SearchPage } from "@/lib/sources/types";
import type { MediaCategory, MediaItem } from "@/lib/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const CATEGORY_OPTIONS: { value: MediaCategory; label: string }[] = [
  { value: "movie", label: "Movies" },
  { value: "shows", label: "Shows" },
  { value: "music", label: "Music" },
  { value: "game", label: "Video Games" },
  { value: "book", label: "Books" },
];

async function fetchSearchPage(
  query: string,
  category: MediaCategory,
  page: number,
): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query,
    category,
    page: String(page),
  });
  const response = await fetch(`/api/search?${params}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Search failed. Try again.");
  }
  return (await response.json()) as SearchPage;
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid="result-skeleton"
          className="flex flex-col border border-edge bg-surface"
        >
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="flex flex-col gap-2 p-4">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LibrarySearch({
  initialCategory,
}: {
  initialCategory?: MediaCategory;
}) {
  const [rawQuery, setRawQuery] = useState("");
  const [category, setCategory] = useState<MediaCategory>(
    initialCategory ?? "movie",
  );
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const query = useDebouncedValue(rawQuery.trim(), 300);

  const {
    data,
    error,
    status,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["library-search", category, query],
    queryFn: ({ pageParam }) => fetchSearchPage(query, category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: query.length > 0,
  });

  // Auto-load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetching) {
        void fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const searching = query.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <MediaDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <div className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="library-query"
            className="block font-label text-xs uppercase tracking-[0.2em] text-ink-muted"
          >
            Search the library
          </label>
          <input
            id="library-query"
            type="search"
            placeholder="Titles, albums, games, books…"
            autoComplete="off"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            className="mt-2 w-full min-h-11 max-w-xl border border-edge bg-bg px-4 py-2 text-ink placeholder:text-ink-muted/60 transition-colors duration-200 focus:border-glow"
          />
        </div>

        <fieldset>
          <legend className="sr-only">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="relative flex min-h-11 cursor-pointer items-center border border-edge px-4 text-sm text-ink-muted transition-colors duration-200 hover:border-glow/50 has-checked:border-glow has-checked:bg-surface-raised has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-glow"
              >
                <input
                  type="radio"
                  name="library-category"
                  value={option.value}
                  checked={category === option.value}
                  onChange={() => setCategory(option.value)}
                  className="absolute inset-0 cursor-pointer appearance-none"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div aria-live="polite" className="sr-only">
        {searching && status === "success"
          ? `${items.length} results loaded`
          : ""}
      </div>

      {!searching ? (
        <p className="max-w-md text-ink-muted">
          Type to search the whole catalog. Filter by shelf to find the exact
          niche you mean.
        </p>
      ) : status === "pending" ? (
        <SkeletonGrid count={10} />
      ) : status === "error" ? (
        <div role="alert" className="max-w-md border-l-2 border-glow pl-4">
          <p className="text-ink">{(error as Error).message}</p>
        </div>
      ) : items.length === 0 ? (
        <p className="max-w-md text-ink-muted">
          Nothing in the catalog matched. Try another spelling or a different
          shelf.
        </p>
      ) : (
        <>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-ink-muted">
            {items.length} results
          </p>
          <ul className="grid list-none grid-cols-2 gap-5 p-0 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => (
              <li key={item.id} className="group relative">
                <MediaCard item={item} />
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`View details for ${item.title}`}
                  onClick={() => setSelectedItem(item)}
                  className="absolute inset-0 cursor-pointer"
                />
              </li>
            ))}
          </ul>

          {isFetchingNextPage ? <SkeletonGrid count={5} /> : null}

          <div ref={sentinelRef} aria-hidden="true" />

          {hasNextPage ? (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="liquid-glass mx-auto flex min-h-11 w-fit items-center rounded-full px-6 text-sm text-ink transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
            >
              Load more
            </button>
          ) : (
            <p className="text-center font-label text-xs uppercase tracking-[0.2em] text-ink-muted">
              That&apos;s the end of the results
            </p>
          )}
        </>
      )}
    </div>
  );
}
