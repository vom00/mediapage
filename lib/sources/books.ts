// The "Books" shelf merges Open Library (print books) with AniList
// manga (Jikan fallback) into one interleaved feed, so manga lives
// alongside novels. If one source is down, the other still returns.

import { searchManga } from "@/lib/sources/anilist";
import { mergeSearchResults } from "@/lib/sources/merge";
import { searchBooks as searchOpenLibrary } from "@/lib/sources/openlibrary";
import type { SearchPage } from "@/lib/sources/types";

export async function searchBookShelf(
  query: string,
  page: number,
): Promise<SearchPage> {
  const results = await Promise.allSettled([
    searchOpenLibrary(query, page),
    searchManga(query, page),
  ]);
  return mergeSearchResults(results, page);
}
