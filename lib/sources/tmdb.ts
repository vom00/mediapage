// TMDB adapter: movies and TV. Fetches and maps to MediaItem; no
// TMDB field names leak past this file.
// Docs: https://developer.themoviedb.org/reference/search-movie

import type { MediaItem } from "@/lib/types";
import {
  PLACEHOLDER_COVER,
  SourceConfigError,
  SourceUpstreamError,
  type SearchPage,
} from "@/lib/sources/types";

const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

interface TmdbMovieResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
}

interface TmdbTvResult {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
}

interface TmdbSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
}

function baseUrl(): string {
  return process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3";
}

function imageBase(): string {
  return process.env.TMDB_IMAGE_BASE ?? "https://image.tmdb.org/t/p/w342";
}

function posterUrl(path: string | null | undefined): string {
  return path ? `${imageBase()}${path}` : PLACEHOLDER_COVER;
}

function yearOf(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

function genreNames(
  ids: number[] | undefined,
  table: Record<number, string>,
): string[] | undefined {
  if (!ids || ids.length === 0) return undefined;
  const names = ids.map((id) => table[id]).filter((n): n is string => !!n);
  return names.length > 0 ? names : undefined;
}

export function mapTmdbMovie(raw: TmdbMovieResult): MediaItem {
  return {
    id: `tmdb:${raw.id}`,
    source: "tmdb",
    sourceId: String(raw.id),
    category: "movie",
    title: raw.title,
    year: yearOf(raw.release_date),
    imageUrl: posterUrl(raw.poster_path),
    synopsis: raw.overview || undefined,
    genres: genreNames(raw.genre_ids, MOVIE_GENRES),
    sourceUrl: `https://www.themoviedb.org/movie/${raw.id}`,
  };
}

export function mapTmdbTv(raw: TmdbTvResult): MediaItem {
  return {
    id: `tmdb:${raw.id}`,
    source: "tmdb",
    sourceId: String(raw.id),
    category: "shows",
    title: raw.name,
    year: yearOf(raw.first_air_date),
    imageUrl: posterUrl(raw.poster_path),
    synopsis: raw.overview || undefined,
    genres: genreNames(raw.genre_ids, TV_GENRES),
    sourceUrl: `https://www.themoviedb.org/tv/${raw.id}`,
  };
}

async function tmdbSearch<T>(
  endpoint: "/search/movie" | "/search/tv",
  query: string,
  page: number,
): Promise<TmdbSearchResponse<T>> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new SourceConfigError(
      "TMDB_API_KEY is not configured on the server.",
    );
  }
  const url = new URL(baseUrl() + endpoint);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("include_adult", "false");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new SourceUpstreamError("TMDB", response.status);
  }
  return (await response.json()) as TmdbSearchResponse<T>;
}

export async function searchTmdbMovies(
  query: string,
  page: number,
): Promise<SearchPage> {
  const data = await tmdbSearch<TmdbMovieResult>("/search/movie", query, page);
  return {
    items: data.results.map(mapTmdbMovie),
    page: data.page,
    hasMore: data.page < data.total_pages,
  };
}

export async function searchTmdbTv(
  query: string,
  page: number,
): Promise<SearchPage> {
  const data = await tmdbSearch<TmdbTvResult>("/search/tv", query, page);
  return {
    items: data.results.map(mapTmdbTv),
    page: data.page,
    hasMore: data.page < data.total_pages,
  };
}
