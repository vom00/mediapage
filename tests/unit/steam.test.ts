// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mapSteamApp, searchGames } from "@/lib/sources/steam";
import { SourceUpstreamError } from "@/lib/sources/types";

const APP = { type: "app", id: 1245620, name: "ELDEN RING" };

let server: http.Server;
let requests: string[] = [];
let nextStatus = 200;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push(req.url ?? "");
    if (nextStatus !== 200) {
      res.writeHead(nextStatus).end("{}");
      nextStatus = 200;
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        total: 2,
        items: [APP, { type: "bundle", id: 999, name: "ELDEN RING Bundle" }],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.STEAM_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.STEAM_IMAGE_BASE = "https://img.test/apps";
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.STEAM_BASE_URL;
  delete process.env.STEAM_IMAGE_BASE;
});

beforeEach(() => {
  requests = [];
});

describe("mapSteamApp", () => {
  test("maps an app to a game MediaItem with portrait box art", () => {
    const item = mapSteamApp(APP);
    expect(item).toMatchObject({
      id: "steam:1245620",
      source: "steam",
      category: "game",
      title: "ELDEN RING",
      imageUrl: "https://img.test/apps/1245620/library_600x900.jpg",
      sourceUrl: "https://store.steampowered.com/app/1245620",
    });
  });
});

describe("searchGames", () => {
  test("queries storesearch and keeps only apps (drops bundles)", async () => {
    const result = await searchGames("elden ring", 1);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/api/storesearch/");
    expect(requests[0]).toContain("term=elden");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("steam:1245620");
    expect(result.hasMore).toBe(false);
  });

  test("returns nothing for pages past the first (storesearch has no paging)", async () => {
    const result = await searchGames("elden ring", 2);
    expect(requests).toHaveLength(0);
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  test("throws SourceUpstreamError on upstream failure", async () => {
    nextStatus = 502;
    await expect(searchGames("x", 1)).rejects.toThrow(SourceUpstreamError);
  });
});
