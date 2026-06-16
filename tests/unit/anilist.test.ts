// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import {
  mapAnilistMedia,
  mapJikanItem,
  searchAnime,
  searchManga,
} from "@/lib/sources/anilist";
import { SourceUpstreamError } from "@/lib/sources/types";

const ANILIST_MEDIA = {
  id: 1,
  title: { romaji: "Mononoke", english: "Mononoke (English)" },
  startDate: { year: 2007 },
  coverImage: { large: "https://img.example/mononoke.jpg" },
  description: "A medicine seller<br>hunts <i>mononoke</i>.",
  genres: ["Mystery", "Supernatural"],
  siteUrl: "https://anilist.co/anime/1",
  studios: { nodes: [{ name: "Toei Animation" }] },
};

const ANILIST_MANGA = {
  id: 7,
  title: { romaji: "Inked Saga", english: null },
  startDate: { year: 1994 },
  coverImage: { large: "https://img.example/inked.jpg" },
  description: "An epic on paper.",
  genres: ["Adventure"],
  siteUrl: "https://anilist.co/manga/7",
  studios: { nodes: [{ name: "Fixture Press" }] },
};

let server: http.Server;
let anilistStatus = 200;
let jikanStatus = 200;
let anilistRequests: string[] = [];
let jikanRequests: string[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url?.startsWith("/anilist")) {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        anilistRequests.push(raw);
        if (anilistStatus !== 200) {
          res.writeHead(anilistStatus).end("{}");
          return;
        }
        const type = JSON.parse(raw || "{}").variables?.type;
        const media = type === "MANGA" ? ANILIST_MANGA : ANILIST_MEDIA;
        res.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({
            data: { Page: { pageInfo: { hasNextPage: true }, media: [media] } },
          }),
        );
      });
      return;
    }
    if (req.url?.startsWith("/jikan/anime")) {
      jikanRequests.push(req.url);
      if (jikanStatus !== 200) {
        res.writeHead(jikanStatus).end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          pagination: { has_next_page: false },
          data: [
            {
              mal_id: 28,
              title: "Mononoke",
              aired: { from: "2007-07-12T00:00:00+00:00" },
              images: { jpg: { large_image_url: "https://img.example/mal.jpg" } },
              synopsis: "Fallback synopsis.",
              genres: [{ name: "Mystery" }],
              studios: [{ name: "Toei Animation" }],
              url: "https://myanimelist.net/anime/28",
            },
          ],
        }),
      );
      return;
    }
    if (req.url?.startsWith("/jikan/manga")) {
      jikanRequests.push(req.url);
      if (jikanStatus !== 200) {
        res.writeHead(jikanStatus).end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          pagination: { has_next_page: false },
          data: [
            {
              mal_id: 55,
              title: "Inked Saga",
              published: { from: "1994-01-01T00:00:00+00:00" },
              images: { jpg: { large_image_url: "https://img.example/manga.jpg" } },
              synopsis: "Paper epic.",
              genres: [{ name: "Adventure" }],
              authors: [{ name: "Fixture Author" }],
              url: "https://myanimelist.net/manga/55",
            },
          ],
        }),
      );
      return;
    }
    res.writeHead(404).end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.ANILIST_BASE_URL = `http://127.0.0.1:${port}/anilist`;
  process.env.JIKAN_BASE_URL = `http://127.0.0.1:${port}/jikan`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.ANILIST_BASE_URL;
  delete process.env.JIKAN_BASE_URL;
});

beforeEach(() => {
  anilistStatus = 200;
  jikanStatus = 200;
  anilistRequests = [];
  jikanRequests = [];
});

describe("mapAnilistMedia", () => {
  test("maps an AniList media node to a MediaItem in the given category", () => {
    const item = mapAnilistMedia(ANILIST_MEDIA, "shows");
    expect(item).toMatchObject({
      id: "anilist:1",
      source: "anilist",
      category: "shows",
      title: "Mononoke (English)",
      subtitle: "Toei Animation",
      year: 2007,
      imageUrl: "https://img.example/mononoke.jpg",
      genres: ["Mystery", "Supernatural"],
      sourceUrl: "https://anilist.co/anime/1",
    });
  });

  test("maps manga to the book category", () => {
    const item = mapAnilistMedia(ANILIST_MANGA, "book");
    expect(item).toMatchObject({
      id: "anilist:7",
      category: "book",
      title: "Inked Saga",
      subtitle: "Fixture Press",
    });
  });

  test("strips HTML from the synopsis", () => {
    const item = mapAnilistMedia(ANILIST_MEDIA, "shows");
    expect(item.synopsis).toBe("A medicine seller hunts mononoke.");
  });

  test("falls back to the romaji title and placeholder cover", () => {
    const item = mapAnilistMedia(
      {
        ...ANILIST_MEDIA,
        title: { romaji: "Mononoke", english: null },
        coverImage: { large: null },
      },
      "shows",
    );
    expect(item.title).toBe("Mononoke");
    expect(item.imageUrl).toBe("/covers/placeholder.svg");
  });
});

describe("searchAnime", () => {
  test("queries AniList for anime with the search term and page", async () => {
    const result = await searchAnime("mononoke", 2);
    expect(anilistRequests).toHaveLength(1);
    const body = JSON.parse(anilistRequests[0]);
    expect(body.variables).toMatchObject({
      search: "mononoke",
      page: 2,
      type: "ANIME",
    });
    expect(result.items[0]).toMatchObject({ source: "anilist", category: "shows" });
    expect(result.hasMore).toBe(true);
    expect(jikanRequests).toHaveLength(0);
  });

  test("falls back to Jikan anime when AniList fails", async () => {
    anilistStatus = 500;
    const result = await searchAnime("mononoke", 1);
    expect(jikanRequests).toHaveLength(1);
    expect(jikanRequests[0]).toContain("/jikan/anime");
    expect(result.items[0]).toMatchObject({
      id: "jikan:28",
      source: "jikan",
      category: "shows",
      title: "Mononoke",
      subtitle: "Toei Animation",
      year: 2007,
    });
  });

  test("throws when both AniList and Jikan fail", async () => {
    anilistStatus = 500;
    jikanStatus = 503;
    await expect(searchAnime("mononoke", 1)).rejects.toThrow(SourceUpstreamError);
  });
});

describe("searchManga", () => {
  test("queries AniList for manga and maps into the book category", async () => {
    const result = await searchManga("inked", 1);
    const body = JSON.parse(anilistRequests[0]);
    expect(body.variables.type).toBe("MANGA");
    expect(result.items[0]).toMatchObject({
      id: "anilist:7",
      source: "anilist",
      category: "book",
      title: "Inked Saga",
    });
    expect(jikanRequests).toHaveLength(0);
  });

  test("falls back to Jikan manga when AniList fails", async () => {
    anilistStatus = 500;
    const result = await searchManga("inked", 1);
    expect(jikanRequests[0]).toContain("/jikan/manga");
    expect(result.items[0]).toMatchObject({
      id: "jikan:55",
      source: "jikan",
      category: "book",
      title: "Inked Saga",
      subtitle: "Fixture Author",
      year: 1994,
    });
  });
});

describe("mapJikanItem", () => {
  test("uses the published date for manga", () => {
    const item = mapJikanItem(
      {
        mal_id: 9,
        title: "Paper Trail",
        published: { from: "2001-05-01T00:00:00+00:00" },
      },
      "book",
    );
    expect(item).toMatchObject({ category: "book", year: 2001 });
  });
});
