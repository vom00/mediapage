import { searchBookShelf } from "@/lib/sources/books";
import { searchMusic } from "@/lib/sources/deezer";
import { searchGames } from "@/lib/sources/games";
import { searchShows } from "@/lib/sources/shows";
import { searchTmdbMovies } from "@/lib/sources/tmdb";
import type { SearchPage } from "@/lib/sources/types";
import type { MediaCategory } from "@/lib/types";

export type SearchFn = (query: string, page: number) => Promise<SearchPage>;

// All five categories are live. "shows" merges TMDB TV and AniList
// anime; "book" merges Open Library and AniList manga; "music" is
// Deezer artists; "game" is IGDB when configured (every platform) and
// otherwise keyless Steam. The Partial type (and the 501 path behind
// it) stays so a source can be pulled without breaking the route
// contract.
export const SEARCH_REGISTRY: Partial<Record<MediaCategory, SearchFn>> = {
  movie: searchTmdbMovies,
  shows: searchShows,
  music: searchMusic,
  game: searchGames,
  book: searchBookShelf,
};

export const ALL_CATEGORIES: MediaCategory[] = [
  "movie",
  "shows",
  "music",
  "game",
  "book",
];

export function isMediaCategory(value: string): value is MediaCategory {
  return (ALL_CATEGORIES as string[]).includes(value);
}
