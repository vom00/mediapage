import { afterEach, describe, expect, test, vi } from "vitest";

// Mock both adapters so the dispatcher's routing can be asserted
// without touching the network.
vi.mock("@/lib/sources/igdb", () => ({
  isIgdbConfigured: vi.fn(),
  searchGames: vi.fn(async () => ({
    items: [{ id: "igdb:1" }],
    page: 1,
    hasMore: false,
  })),
}));
vi.mock("@/lib/sources/steam", () => ({
  searchGames: vi.fn(async () => ({
    items: [{ id: "steam:1" }],
    page: 1,
    hasMore: false,
  })),
}));

import { searchGames } from "@/lib/sources/games";
import { isIgdbConfigured, searchGames as igdbSearch } from "@/lib/sources/igdb";
import { searchGames as steamSearch } from "@/lib/sources/steam";

const mockedConfigured = vi.mocked(isIgdbConfigured);

afterEach(() => vi.clearAllMocks());

describe("searchGames dispatcher", () => {
  test("uses IGDB when credentials are configured", async () => {
    mockedConfigured.mockReturnValue(true);
    const result = await searchGames("zelda", 2);
    expect(igdbSearch).toHaveBeenCalledWith("zelda", 2);
    expect(steamSearch).not.toHaveBeenCalled();
    expect(result.items[0].id).toBe("igdb:1");
  });

  test("falls back to keyless Steam when IGDB is not configured", async () => {
    mockedConfigured.mockReturnValue(false);
    const result = await searchGames("zelda", 1);
    expect(steamSearch).toHaveBeenCalledWith("zelda", 1);
    expect(igdbSearch).not.toHaveBeenCalled();
    expect(result.items[0].id).toBe("steam:1");
  });
});
