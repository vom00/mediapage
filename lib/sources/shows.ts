// "Shows" merges live-action TV (TMDB) and anime (AniList, with the
// Jikan fallback) into one interleaved feed. If one source is
// unconfigured or down, the other still returns.

import { searchAnime } from "@/lib/sources/anilist";
import { mergeSearchResults } from "@/lib/sources/merge";
import { searchTmdbTv } from "@/lib/sources/tmdb";
import type { SearchPage } from "@/lib/sources/types";

export async function searchShows(
  query: string,
  page: number,
): Promise<SearchPage> {
  const results = await Promise.allSettled([
    searchTmdbTv(query, page),
    searchAnime(query, page),
  ]);
  return mergeSearchResults(results, page);
}
