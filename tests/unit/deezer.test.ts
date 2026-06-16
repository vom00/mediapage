// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mapDeezerArtist, searchMusic } from "@/lib/sources/deezer";
import { SourceUpstreamError } from "@/lib/sources/types";

const ARTIST = {
  id: 27,
  name: "Daft Punk",
  link: "https://www.deezer.com/artist/27",
  picture_xl: "https://cdn-images.dzcdn.net/images/artist/abc/1000x1000.jpg",
  picture_big: "https://cdn-images.dzcdn.net/images/artist/abc/500x500.jpg",
  nb_album: 38,
};

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
    const url = new URL(req.url ?? "/", "http://localhost");
    const index = Number(url.searchParams.get("index") ?? "0");
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        data: [ARTIST],
        total: 40,
        next:
          index + 20 < 40
            ? `http://example/next?index=${index + 20}`
            : undefined,
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.DEEZER_BASE_URL = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.DEEZER_BASE_URL;
});

beforeEach(() => {
  requests = [];
});

describe("mapDeezerArtist", () => {
  test("maps an artist to a music MediaItem with its photo", () => {
    const item = mapDeezerArtist(ARTIST);
    expect(item).toMatchObject({
      id: "deezer:27",
      source: "deezer",
      category: "music",
      title: "Daft Punk",
      subtitle: "38 albums",
      imageUrl: "https://cdn-images.dzcdn.net/images/artist/abc/1000x1000.jpg",
      sourceUrl: "https://www.deezer.com/artist/27",
    });
    expect(item.year).toBeUndefined();
  });

  test("falls back to the placeholder when there is no photo", () => {
    const item = mapDeezerArtist({ id: 9, name: "Nobody" });
    expect(item.imageUrl).toBe("/covers/placeholder.svg");
    expect(item.subtitle).toBeUndefined();
  });
});

describe("searchMusic", () => {
  test("queries artist search with index paging", async () => {
    const result = await searchMusic("daft punk", 2);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/search/artist");
    expect(requests[0]).toContain("q=daft");
    expect(requests[0]).toContain("index=20");
    expect(requests[0]).toContain("limit=20");
    expect(result.items[0].category).toBe("music");
  });

  test("hasMore follows the next link", async () => {
    const first = await searchMusic("x", 1);
    expect(first.hasMore).toBe(true);
    const last = await searchMusic("x", 2);
    expect(last.hasMore).toBe(false);
  });

  test("throws SourceUpstreamError on failure", async () => {
    nextStatus = 503;
    await expect(searchMusic("x", 1)).rejects.toThrow(SourceUpstreamError);
  });
});
