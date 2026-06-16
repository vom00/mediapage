// Video-games dispatcher. Prefers IGDB ("every video game", all
// platforms) when its Twitch credentials are configured, and otherwise
// falls back to Steam's keyless storefront so the games shelf keeps
// working with zero setup. Adding IGDB_CLIENT_ID/IGDB_CLIENT_SECRET
// upgrades the shelf to the full catalogue with no code change.

import { isIgdbConfigured, searchGames as searchIgdb } from "@/lib/sources/igdb";
import { searchGames as searchSteam } from "@/lib/sources/steam";
import type { SearchPage } from "@/lib/sources/types";

export function searchGames(query: string, page: number): Promise<SearchPage> {
  return isIgdbConfigured() ? searchIgdb(query, page) : searchSteam(query, page);
}
