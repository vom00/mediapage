// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  isIgdbConfigured,
  mapIgdbGame,
  searchGames,
} from "@/lib/sources/igdb";
import { SourceUpstreamError } from "@/lib/sources/types";

const GAME = {
  id: 1020,
  name: "Grand Theft Auto V",
  cover: { image_id: "co1r76" },
  first_release_date: 1379376000, // 2013-09-17 UTC
  url: "https://www.igdb.com/games/grand-theft-auto-v",
  platforms: [{ abbreviation: "PC" }, { abbreviation: "PS5" }],
};

let server: http.Server;
let requests: string[] = [];
let tokenIssued = 0;
let failGamesNext = false;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const path = (req.url ?? "").split("?")[0];
    requests.push(path);
    if (path === "/token") {
      tokenIssued++;
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ access_token: "tok-123", expires_in: 5000000 }));
      return;
    }
    if (path === "/games") {
      if (failGamesNext) {
        failGamesNext = false;
        res.writeHead(500).end("{}");
        return;
      }
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify([GAME]));
      return;
    }
    res.writeHead(404).end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  process.env.IGDB_CLIENT_ID = "cid";
  process.env.IGDB_CLIENT_SECRET = "secret";
  process.env.IGDB_TOKEN_URL = `${base}/token`;
  process.env.IGDB_BASE_URL = base;
  process.env.IGDB_IMAGE_BASE = "https://img.test/igdb";
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const name of [
    "IGDB_CLIENT_ID",
    "IGDB_CLIENT_SECRET",
    "IGDB_TOKEN_URL",
    "IGDB_BASE_URL",
    "IGDB_IMAGE_BASE",
  ]) {
    delete process.env[name];
  }
});

beforeEach(() => {
  requests = [];
});

describe("isIgdbConfigured", () => {
  test("true only when both credentials are present", () => {
    expect(isIgdbConfigured()).toBe(true);
    const saved = process.env.IGDB_CLIENT_SECRET;
    delete process.env.IGDB_CLIENT_SECRET;
    expect(isIgdbConfigured()).toBe(false);
    process.env.IGDB_CLIENT_SECRET = saved;
  });
});

describe("mapIgdbGame", () => {
  test("maps a game to a MediaItem with portrait cover art and year", () => {
    const item = mapIgdbGame(GAME);
    expect(item).toMatchObject({
      id: "igdb:1020",
      source: "igdb",
      category: "game",
      title: "Grand Theft Auto V",
      year: 2013,
      subtitle: "PC, PS5",
      imageUrl: "https://img.test/igdb/t_cover_big/co1r76.jpg",
      sourceUrl: "https://www.igdb.com/games/grand-theft-auto-v",
    });
  });

  test("falls back to the placeholder cover when a game has none", () => {
    const item = mapIgdbGame({ id: 5, name: "No Cover Game" });
    expect(item.imageUrl).toBe("/covers/placeholder.svg");
    expect(item.subtitle).toBeUndefined();
    expect(item.year).toBeUndefined();
  });
});

describe("searchGames", () => {
  test("authenticates, then queries the games endpoint", async () => {
    const result = await searchGames("gta", 1);
    // A token is fetched (once, then cached) before the games query.
    expect(requests).toContain("/token");
    expect(requests).toContain("/games");
    expect(tokenIssued).toBeGreaterThanOrEqual(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("igdb:1020");
    expect(result.page).toBe(1);
  });

  test("reuses the cached token on the next search", async () => {
    const before = tokenIssued;
    await searchGames("halo", 1);
    expect(tokenIssued).toBe(before); // no new token request
    expect(requests).toEqual(["/games"]);
  });

  test("throws SourceUpstreamError when the games endpoint fails", async () => {
    failGamesNext = true;
    await expect(searchGames("x", 1)).rejects.toThrow(SourceUpstreamError);
  });
});
