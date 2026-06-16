// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { GET } from "@/app/api/search/route";
import { searchCache } from "@/lib/search-cache";
import {
  SEARCH_RATELIMIT_MAX,
  searchRateLimiter,
} from "@/lib/search-rate-limit";

let server: http.Server;
let upstreamHits = 0;
let nextStatus = 200;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    upstreamHits++;
    if (nextStatus !== 200) {
      res.writeHead(nextStatus).end("{}");
      nextStatus = 200;
      return;
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    const page = Number(url.searchParams.get("page") ?? "1");
    const json = (body: unknown) =>
      res
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify(body));

    if (url.pathname === "/anilist") {
      json({
        data: {
          Page: {
            pageInfo: { hasNextPage: false },
            media: [
              {
                id: 1,
                title: { romaji: "Fixture Anime", english: null },
                startDate: { year: 2007 },
                coverImage: { large: null },
                genres: [],
                siteUrl: "https://anilist.co/anime/1",
              },
            ],
          },
        },
      });
      return;
    }
    if (url.pathname === "/api/storesearch/") {
      json({ total: 1, items: [{ type: "app", id: 1, name: "Fixture Game" }] });
      return;
    }
    if (url.pathname === "/search.json") {
      json({ numFound: 1, docs: [{ key: "/works/OL1W", title: "Fixture Book" }] });
      return;
    }
    if (url.pathname === "/search/artist") {
      json({ total: 1, data: [{ id: 1, name: "Fixture Artist" }] });
      return;
    }
    json({
      page,
      total_pages: 2,
      results: [
        {
          id: 27205,
          title: `Inception p${page}`,
          name: `Inception p${page}`,
          release_date: "2010-07-15",
          first_air_date: "2010-07-15",
          poster_path: "/inception.jpg",
          overview: "Dreams.",
          genre_ids: [28],
        },
      ],
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  process.env.TMDB_BASE_URL = base;
  process.env.TMDB_API_KEY = "test-key";
  process.env.ANILIST_BASE_URL = `${base}/anilist`;
  process.env.STEAM_BASE_URL = base;
  process.env.STEAM_IMAGE_BASE = `${base}/img`;
  process.env.OPENLIBRARY_BASE_URL = base;
  process.env.DEEZER_BASE_URL = base;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  for (const name of [
    "TMDB_BASE_URL",
    "TMDB_API_KEY",
    "ANILIST_BASE_URL",
    "STEAM_BASE_URL",
    "STEAM_IMAGE_BASE",
    "OPENLIBRARY_BASE_URL",
    "DEEZER_BASE_URL",
  ]) {
    delete process.env[name];
  }
});

beforeEach(() => {
  searchCache.clear();
  searchRateLimiter.reset();
  upstreamHits = 0;
});

// Builds a request from a specific client IP via the forwarding
// header the proxy would set in production.
function searchRequestFromIp(
  ip: string,
  params: Record<string, string>,
): Request {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

function searchRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url);
}

describe("GET /api/search", () => {
  test("400 when the query is missing or blank", async () => {
    const res = await GET(searchRequest({ category: "movie" }));
    expect(res.status).toBe(400);
    const blank = await GET(searchRequest({ q: "   ", category: "movie" }));
    expect(blank.status).toBe(400);
  });

  test("400 for an unknown category", async () => {
    const res = await GET(searchRequest({ q: "x", category: "podcast" }));
    expect(res.status).toBe(400);
  });

  test("400 for a non-positive or non-integer page", async () => {
    const zero = await GET(
      searchRequest({ q: "x", category: "movie", page: "0" }),
    );
    expect(zero.status).toBe(400);
    const nan = await GET(
      searchRequest({ q: "x", category: "movie", page: "two" }),
    );
    expect(nan.status).toBe(400);
  });

  test("every category dispatches to its source adapter", async () => {
    const expectations: Record<string, string> = {
      movie: "Inception p1",
      // "shows" interleaves TMDB TV (first) with AniList anime.
      shows: "Inception p1",
      game: "Fixture Game",
      book: "Fixture Book",
      music: "Fixture Artist",
    };
    for (const [category, title] of Object.entries(expectations)) {
      const res = await GET(searchRequest({ q: "fixture", category }));
      expect(res.status, category).toBe(200);
      const body = await res.json();
      expect(body.items[0].category, category).toBe(category);
      expect(body.items[0].title, category).toBe(title);
    }
  });

  test("returns normalized items for a movie search", async () => {
    const res = await GET(searchRequest({ q: "inception", category: "movie" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0]).toMatchObject({
      id: "tmdb:27205",
      category: "movie",
      title: "Inception p1",
    });
    expect(body.page).toBe(1);
    expect(body.hasMore).toBe(true);
  });

  test("caches identical searches so upstream is hit once", async () => {
    await GET(searchRequest({ q: "inception", category: "movie" }));
    await GET(searchRequest({ q: "inception", category: "movie" }));
    await GET(searchRequest({ q: "INCEPTION", category: "movie" }));
    expect(upstreamHits).toBe(1);

    await GET(searchRequest({ q: "inception", category: "movie", page: "2" }));
    expect(upstreamHits).toBe(2);
  });

  test("503 with a friendly message when the source key is missing", async () => {
    const saved = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;
    const res = await GET(searchRequest({ q: "x", category: "movie" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/i);
    process.env.TMDB_API_KEY = saved;
  });

  test("502 when the upstream source fails", async () => {
    nextStatus = 500;
    const res = await GET(searchRequest({ q: "x", category: "movie" }));
    expect(res.status).toBe(502);
  });

  test("rate-limits a single IP past the per-window cap", async () => {
    const ip = "203.0.113.7";
    for (let i = 0; i < SEARCH_RATELIMIT_MAX; i++) {
      const ok = await GET(searchRequestFromIp(ip, { q: "a", category: "movie" }));
      expect(ok.status, `request ${i + 1}`).not.toBe(429);
    }
    const blocked = await GET(
      searchRequestFromIp(ip, { q: "a", category: "movie" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    const body = await blocked.json();
    expect(body.error).toMatch(/too many/i);
  });

  test("rate limit is per-IP, so a different IP is unaffected", async () => {
    const noisy = "203.0.113.8";
    for (let i = 0; i <= SEARCH_RATELIMIT_MAX; i++) {
      await GET(searchRequestFromIp(noisy, { q: "a", category: "movie" }));
    }
    const other = await GET(
      searchRequestFromIp("203.0.113.9", { q: "a", category: "movie" }),
    );
    expect(other.status).toBe(200);
  });

  test("requests without a forwarded IP (local/dev) are never limited", async () => {
    for (let i = 0; i <= SEARCH_RATELIMIT_MAX + 5; i++) {
      const res = await GET(searchRequest({ q: "a", category: "movie" }));
      expect(res.status).toBe(200);
    }
  });
});
