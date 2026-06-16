// Steam storefront adapter for video games. Replaces RAWG, whose
// public API stopped working. Steam's storesearch endpoint needs no
// API key, and every app exposes predictable portrait "library" box
// art (600x900), which fits the game-case shelf piece exactly.

import type { MediaItem } from "@/lib/types";
import { SourceUpstreamError, type SearchPage } from "@/lib/sources/types";

interface SteamSearchItem {
  type: string; // "app" | "bundle" | "sub" | ...
  id: number;
  name: string;
}

// Steam's library portrait art lives at a stable, key-free CDN path
// keyed by app id. Override the base in tests/E2E.
function imageBase(): string {
  return (
    process.env.STEAM_IMAGE_BASE ??
    "https://cdn.cloudflare.steamstatic.com/steam/apps"
  );
}

export function mapSteamApp(raw: SteamSearchItem): MediaItem {
  return {
    id: `steam:${raw.id}`,
    source: "steam",
    sourceId: String(raw.id),
    category: "game",
    title: raw.name,
    // storesearch returns no year/genre; the portrait box art carries
    // the recognition, and the card falls back to the placeholder if
    // an app has no library image.
    imageUrl: `${imageBase()}/${raw.id}/library_600x900.jpg`,
    sourceUrl: `https://store.steampowered.com/app/${raw.id}`,
  };
}

export async function searchGames(
  query: string,
  page: number,
): Promise<SearchPage> {
  // storesearch returns a single ranked result set with no paging, so
  // only the first page carries results.
  if (page > 1) {
    return { items: [], page, hasMore: false };
  }
  const base = process.env.STEAM_BASE_URL ?? "https://store.steampowered.com";
  const url = new URL(`${base}/api/storesearch/`);
  url.searchParams.set("term", query);
  url.searchParams.set("cc", "us");
  url.searchParams.set("l", "en");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new SourceUpstreamError("Steam", response.status);
  }
  const json = (await response.json()) as {
    total: number;
    items: SteamSearchItem[];
  };
  return {
    items: (json.items ?? [])
      .filter((item) => item.type === "app")
      .map(mapSteamApp),
    page,
    hasMore: false,
  };
}
