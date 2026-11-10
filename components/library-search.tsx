"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  CARD_INFO_HEIGHT,
  MediaCard,
  SHELF_HUE,
  shelfStyle,
} from "@/components/media-card";
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

// Same grid as the results, same card anatomy: a cover block and the
// fixed-height info block, so nothing moves when results arrive.
const GRID_CLASS =
  "grid list-none grid-cols-2 gap-x-5 gap-y-8 p-0 sm:grid-cols-3 lg:grid-cols-5";

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div aria-hidden="true" className={GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-testid="result-skeleton" className="flex flex-col">
          <div className="skeleton aspect-[2/3] w-full rounded-[var(--radius-md)]" />
          <div className={`flex flex-col gap-2 pt-3 ${CARD_INFO_HEIGHT}`}>
            <div className="skeleton h-4 w-3/4 rounded-sm" />
            <div className="skeleton h-3 w-1/2 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// An empty shelf: five dashed outlines where covers will stand.
function EmptyShelf() {
  return (
    <div aria-hidden="true" className={`${GRID_CLASS} opacity-60`}>
      {Object.values(SHELF_HUE).map((hue, i) => (
        <div
          key={hue}
          style={{ "--shelf": hue } as React.CSSProperties}
          className={
            i < 2 ? "block" : i === 2 ? "hidden sm:block" : "hidden lg:block"
          }
        >
          <div className="aspect-[2/3] w-full rounded-[var(--radius-md)] border border-dashed border-edge" />
          <div className="mt-3 h-0.5 w-8 rounded-full bg-(--shelf) opacity-60" />
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
  const reduceMotion = useReducedMotion();
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

  const pages = data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const searching = query.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <MediaDetailDialog
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <div className="flex flex-col gap-6">
        <div
          className="enter-up max-w-2xl"
          style={{ "--enter-i": 1 } as React.CSSProperties}
        >
          <label
            htmlFor="library-query"
            className="block text-sm font-medium text-ink"
          >
            Search the library
          </label>
          <div className="relative mt-3">
            <Search
              aria-hidden="true"
              strokeWidth={1.75}
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              id="library-query"
              type="search"
              placeholder="Titles, artists, games, books…"
              autoComplete="off"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="field min-h-14 pl-12 text-lg [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>
        </div>

        <fieldset>
          <legend className="sr-only">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((option) => (
              <label
                key={option.value}
                style={shelfStyle(option.value)}
                className="relative flex min-h-11 cursor-pointer items-center rounded-full border border-edge px-4 text-sm font-medium text-ink-muted transition-colors duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:text-ink has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-glow"
              >
                <input
                  type="radio"
                  name="library-category"
                  value={option.value}
                  checked={category === option.value}
                  onChange={() => setCategory(option.value)}
                  className="absolute inset-0 z-10 cursor-pointer appearance-none opacity-0"
                />
                {category === option.value ? (
                  <motion.span
                    aria-hidden="true"
                    layoutId="library-category-indicator"
                    transition={{
                      duration: reduceMotion ? 0 : 0.24,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                    style={{ borderRadius: 9999 }}
                    // Exactly the chip's own box: -1px covers the label's
                    // border, and the edge is drawn inside it.
                    className="absolute -inset-px border border-ink-muted bg-surface-raised"
                  />
                ) : null}
                <span className="relative">{option.label}</span>
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
        <div className="flex flex-col gap-8">
          <p className="max-w-md text-ink-muted">
            Type to search the whole catalog. Filter by shelf to find the exact
            niche you mean.
          </p>
          <EmptyShelf />
        </div>
      ) : status === "pending" ? (
        <SkeletonGrid count={10} />
      ) : status === "error" ? (
        <div role="alert" className="max-w-md border-l-2 border-danger pl-4">
          <p className="text-ink">{(error as Error).message}</p>
        </div>
      ) : items.length === 0 ? (
        <p className="max-w-md text-ink-muted">
          Nothing in the catalog matched. Try another spelling or a different
          shelf.
        </p>
      ) : (
        <>
          <p className="-mb-4 text-sm text-ink-muted">{items.length} results</p>
          <div className="flex flex-col gap-8">
            {pages.map((page, pageIndex) => (
              // Each page of results arrives card by card, once.
              <ul key={pageIndex} className={GRID_CLASS}>
                {page.items.map((item, itemIndex) => (
                  <li
                    key={item.id}
                    className="arrive group relative"
                    style={{ "--arrive-i": itemIndex } as React.CSSProperties}
                  >
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
            ))}
          </div>

          {isFetchingNextPage ? <SkeletonGrid count={5} /> : null}

          <div ref={sentinelRef} aria-hidden="true" />

          {hasNextPage ? (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn mx-auto"
            >
              Load more
            </button>
          ) : (
            <p className="text-center text-sm text-ink-muted">
              That&apos;s the end of the results
            </p>
          )}
        </>
      )}
    </div>
  );
}
