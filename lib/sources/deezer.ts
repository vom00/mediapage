// Deezer adapter for music. The music shelf collects *artists*, not
// individual songs or albums, so this hits Deezer's artist search.
// No API key required, and every artist comes with a photo (used as
// the vinyl-label cover), which MusicBrainz could not provide.

import type { MediaItem } from "@/lib/types";
import {
  PLACEHOLDER_COVER,
  SourceUpstreamError,
  type SearchPage,
} from "@/lib/sources/types";

const PAGE_SIZE = 20;

interface DeezerArtist {
  id: number;
  name: string;
  link?: string;
  picture_xl?: string;
  picture_big?: string;
  picture_medium?: string;
  nb_album?: number;
}

export function mapDeezerArtist(raw: DeezerArtist): MediaItem {
  const image = raw.picture_xl || raw.picture_big || raw.picture_medium;
  return {
    id: `deezer:${raw.id}`,
    source: "deezer",
    sourceId: String(raw.id),
    category: "music",
    title: raw.name,
    // Artists have no release year; albums count is the only useful
    // hint Deezer gives, shown as a quiet subtitle when present.
    subtitle:
      raw.nb_album && raw.nb_album > 0
        ? `${raw.nb_album} album${raw.nb_album === 1 ? "" : "s"}`
        : undefined,
    imageUrl: image || PLACEHOLDER_COVER,
    sourceUrl: raw.link ?? `https://www.deezer.com/artist/${raw.id}`,
  };
}

export async function searchMusic(
  query: string,
  page: number,
): Promise<SearchPage> {
  const base = process.env.DEEZER_BASE_URL ?? "https://api.deezer.com";
  const url = new URL(`${base}/search/artist`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("index", String((page - 1) * PAGE_SIZE));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new SourceUpstreamError("Deezer", response.status);
  }
  const json = (await response.json()) as {
    data: DeezerArtist[];
    total: number;
    next?: string;
  };
  return {
    items: (json.data ?? []).map(mapDeezerArtist),
    page,
    hasMore: Boolean(json.next),
  };
}
