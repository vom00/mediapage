// IGDB (Internet Game Database) adapter for video games. IGDB is the
// most comprehensive cross-platform game catalogue there is — it backs
// most game sites — so it answers "every video game" rather than a
// single storefront like Steam.
//
// IGDB needs free Twitch app credentials: a Client ID and Client Secret
// (server-side only). Set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET. When
// they're absent the registry falls back to the keyless Steam source so
// the games shelf still works out of the box (see lib/sources/games.ts).
//
// Auth is Twitch's OAuth client-credentials flow: exchange the id+secret
// for a bearer token (valid ~60 days), cached in-process here.

import type { MediaItem } from "@/lib/types";
import {
  PLACEHOLDER_COVER,
  SourceUpstreamError,
  type SearchPage,
} from "@/lib/sources/types";

const PAGE_SIZE = 20;

interface IgdbCover {
  image_id?: string;
}
interface IgdbPlatform {
  abbreviation?: string;
  name?: string;
}
interface IgdbGame {
  id: number;
  name: string;
  cover?: IgdbCover;
  first_release_date?: number; // unix seconds
  url?: string;
  platforms?: IgdbPlatform[];
}

export function isIgdbConfigured(): boolean {
  return Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET);
}

function apiBase(): string {
  return process.env.IGDB_BASE_URL ?? "https://api.igdb.com/v4";
}
function tokenUrl(): string {
  return process.env.IGDB_TOKEN_URL ?? "https://id.twitch.tv/oauth2/token";
}
function imageBase(): string {
  return (
    process.env.IGDB_IMAGE_BASE ??
    "https://images.igdb.com/igdb/image/upload"
  );
}

// In-process bearer-token cache. Twitch tokens last ~60 days; refresh a
// minute early to avoid using one that expires mid-flight.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }
  const url = new URL(tokenUrl());
  url.searchParams.set("client_id", process.env.IGDB_CLIENT_ID ?? "");
  url.searchParams.set("client_secret", process.env.IGDB_CLIENT_SECRET ?? "");
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok) {
    throw new SourceUpstreamError("IGDB", res.status);
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new SourceUpstreamError("IGDB", 502);
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

function platformSubtitle(platforms?: IgdbPlatform[]): string | undefined {
  if (!platforms || platforms.length === 0) return undefined;
  const labels = platforms
    .map((p) => p.abbreviation ?? p.name)
    .filter((x): x is string => Boolean(x));
  if (labels.length === 0) return undefined;
  // Keep the subtitle short — show the first few platforms only.
  return labels.slice(0, 3).join(", ");
}

export function mapIgdbGame(raw: IgdbGame): MediaItem {
  const year = raw.first_release_date
    ? new Date(raw.first_release_date * 1000).getUTCFullYear()
    : undefined;
  return {
    id: `igdb:${raw.id}`,
    source: "igdb",
    sourceId: String(raw.id),
    category: "game",
    title: raw.name,
    subtitle: platformSubtitle(raw.platforms),
    year,
    // IGDB portrait cover art (264x374) fits the game-case piece; fall
    // back to the monochrome placeholder when a game has no cover.
    imageUrl: raw.cover?.image_id
      ? `${imageBase()}/t_cover_big/${raw.cover.image_id}.jpg`
      : PLACEHOLDER_COVER,
    sourceUrl: raw.url,
  };
}

export async function searchGames(
  query: string,
  page: number,
): Promise<SearchPage> {
  const token = await accessToken();
  const offset = (page - 1) * PAGE_SIZE;
  // Apicalypse query body (plain text). Escape embedded quotes so a
  // title with a quote can't break out of the search string.
  const safe = query.replace(/["\\]/g, "\\$&");
  const body = [
    `search "${safe}";`,
    "fields name, cover.image_id, first_release_date, url," +
      " platforms.abbreviation, platforms.name;",
    `limit ${PAGE_SIZE};`,
    `offset ${offset};`,
  ].join(" ");

  const res = await fetch(`${apiBase()}/games`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID ?? "",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SourceUpstreamError("IGDB", res.status);
  }
  const json = (await res.json()) as IgdbGame[];
  const items = (json ?? []).filter((g) => g && g.name).map(mapIgdbGame);
  return { items, page, hasMore: items.length === PAGE_SIZE };
}
