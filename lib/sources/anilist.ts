// Anime and manga search via AniList GraphQL (no key required), with
// Jikan (MyAnimeList) as the fallback when AniList is down. Anime
// maps to the "shows" shelf, manga to "book". Both normalize to
// MediaItem; nothing source-specific leaks out.

import type { MediaCategory, MediaItem } from "@/lib/types";
import {
  PLACEHOLDER_COVER,
  SourceUpstreamError,
  type SearchPage,
} from "@/lib/sources/types";

// AniList media type; ANIME powers Shows, MANGA powers Books.
type AnilistType = "ANIME" | "MANGA";

const ANILIST_QUERY = `
query ($search: String!, $page: Int!, $type: MediaType!) {
  Page(page: $page, perPage: 20) {
    pageInfo { hasNextPage }
    media(search: $search, type: $type) {
      id
      title { romaji english }
      startDate { year }
      coverImage { large }
      description
      genres
      siteUrl
      studios(isMain: true) { nodes { name } }
    }
  }
}`;

interface AnilistMedia {
  id: number;
  title: { romaji: string | null; english: string | null };
  startDate?: { year: number | null };
  coverImage?: { large: string | null };
  description?: string | null;
  genres?: string[];
  siteUrl?: string;
  studios?: { nodes: { name: string }[] };
}

interface JikanItem {
  mal_id: number;
  title: string;
  aired?: { from: string | null };
  published?: { from: string | null };
  images?: { jpg?: { large_image_url?: string | null } };
  synopsis?: string | null;
  genres?: { name: string }[];
  studios?: { name: string }[];
  authors?: { name: string }[];
  url?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapAnilistMedia(
  raw: AnilistMedia,
  category: MediaCategory,
): MediaItem {
  return {
    id: `anilist:${raw.id}`,
    source: "anilist",
    sourceId: String(raw.id),
    category,
    title: raw.title.english ?? raw.title.romaji ?? "Untitled",
    subtitle: raw.studios?.nodes[0]?.name,
    year: raw.startDate?.year ?? undefined,
    imageUrl: raw.coverImage?.large ?? PLACEHOLDER_COVER,
    synopsis: raw.description ? stripHtml(raw.description) : undefined,
    genres: raw.genres?.length ? raw.genres : undefined,
    sourceUrl: raw.siteUrl,
  };
}

export function mapJikanItem(
  raw: JikanItem,
  category: MediaCategory,
): MediaItem {
  const date = raw.aired?.from ?? raw.published?.from;
  const year = date ? Number(date.slice(0, 4)) : undefined;
  return {
    id: `jikan:${raw.mal_id}`,
    source: "jikan",
    sourceId: String(raw.mal_id),
    category,
    title: raw.title,
    subtitle: raw.studios?.[0]?.name ?? raw.authors?.[0]?.name,
    year: Number.isFinite(year) ? year : undefined,
    imageUrl: raw.images?.jpg?.large_image_url ?? PLACEHOLDER_COVER,
    synopsis: raw.synopsis ?? undefined,
    genres: raw.genres?.length ? raw.genres.map((g) => g.name) : undefined,
    sourceUrl: raw.url,
  };
}

async function searchAnilist(
  query: string,
  page: number,
  type: AnilistType,
  category: MediaCategory,
): Promise<SearchPage> {
  const url = process.env.ANILIST_BASE_URL ?? "https://graphql.anilist.co";
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: ANILIST_QUERY,
      variables: { search: query, page, type },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new SourceUpstreamError("AniList", response.status);
  }
  const json = (await response.json()) as {
    data: {
      Page: { pageInfo: { hasNextPage: boolean }; media: AnilistMedia[] };
    };
  };
  return {
    items: json.data.Page.media.map((m) => mapAnilistMedia(m, category)),
    page,
    hasMore: json.data.Page.pageInfo.hasNextPage,
  };
}

async function searchJikan(
  query: string,
  page: number,
  kind: "anime" | "manga",
  category: MediaCategory,
): Promise<SearchPage> {
  const base = process.env.JIKAN_BASE_URL ?? "https://api.jikan.moe/v4";
  const url = new URL(`${base}/${kind}`);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "20");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new SourceUpstreamError("Jikan", response.status);
  }
  const json = (await response.json()) as {
    pagination?: { has_next_page?: boolean };
    data: JikanItem[];
  };
  return {
    items: json.data.map((m) => mapJikanItem(m, category)),
    page,
    hasMore: json.pagination?.has_next_page ?? false,
  };
}

export async function searchAnime(
  query: string,
  page: number,
): Promise<SearchPage> {
  try {
    return await searchAnilist(query, page, "ANIME", "shows");
  } catch {
    // AniList is down or rate limited; the fallback keeps anime
    // search alive. If Jikan also fails, its error propagates.
    return await searchJikan(query, page, "anime", "shows");
  }
}

export async function searchManga(
  query: string,
  page: number,
): Promise<SearchPage> {
  try {
    return await searchAnilist(query, page, "MANGA", "book");
  } catch {
    return await searchJikan(query, page, "manga", "book");
  }
}
