import { LruCache } from "@/lib/cache";
import type { SearchPage } from "@/lib/sources/types";

// Shared across requests within one server process. Five minutes is
// short enough for fresh catalogs and long enough to absorb repeat
// queries and infinite-scroll backtracking.
export const searchCache = new LruCache<SearchPage>({
  maxEntries: 500,
  ttlMs: 5 * 60 * 1000,
});
