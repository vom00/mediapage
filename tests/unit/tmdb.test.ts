// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  mapTmdbMovie,
  mapTmdbTv,
  searchTmdbMovies,
  searchTmdbTv,
} from "@/lib/sources/tmdb";
import { SourceConfigError, SourceUpstreamError } from "@/lib/sources/types";

const MOVIE_RESULT = {
  id: 27205,
  title: "Inception",
  release_date: "2010-07-15",
  poster_path: "/inception.jpg",
  overview: "A thief who steals corporate secrets through dreams.",
  genre_ids: [28, 878],
};

const TV_RESULT = {
  id: 1396,
  name: "Breaking Bad",
  first_air_date: "2008-01-20",
  poster_path: null,
  overview: "A chemistry teacher turns to crime.",
  genre_ids: [18, 80],
};

let server: http.Server;
let requests: string[] = [];
let nextStatus = 200;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push(req.url ?? "");
    if (nextStatus !== 200) {
      res.writeHead(nextStatus).end(JSON.stringify({ status_message: "boom" }));
      nextStatus = 200;
      return;
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    const page = Number(url.searchParams.get("page") ?? "1");
    const payload = url.pathname.includes("/search/movie")
      ? { page, results: [MOVIE_RESULT], total_pages: 3 }
      : { page, results: [TV_RESULT], total_pages: page };
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify(payload));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.TMDB_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.TMDB_API_KEY = "test-key";
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.TMDB_BASE_URL;
  delete process.env.TMDB_API_KEY;
});

afterEach(() => {
  requests = [];
});

describe("mapTmdbMovie", () => {
  test("maps a raw TMDB movie to a MediaItem", () => {
    const item = mapTmdbMovie(MOVIE_RESULT);
    expect(item).toMatchObject({
      id: "tmdb:27205",
      source: "tmdb",
      sourceId: "27205",
      category: "movie",
      title: "Inception",
      year: 2010,
      synopsis: "A thief who steals corporate secrets through dreams.",
      genres: ["Action", "Science Fiction"],
      sourceUrl: "https://www.themoviedb.org/movie/27205",
    });
    expect(item.imageUrl).toContain("/inception.jpg");
  });

  test("falls back to the local placeholder when poster is missing", () => {
    const item = mapTmdbMovie({ ...MOVIE_RESULT, poster_path: null });
    expect(item.imageUrl).toBe("/covers/placeholder.svg");
  });

  test("omits year when release_date is empty", () => {
    const item = mapTmdbMovie({ ...MOVIE_RESULT, release_date: "" });
    expect(item.year).toBeUndefined();
  });
});

describe("mapTmdbTv", () => {
  test("maps a raw TMDB TV result to a MediaItem", () => {
    const item = mapTmdbTv(TV_RESULT);
    expect(item).toMatchObject({
      id: "tmdb:1396",
      category: "shows",
      title: "Breaking Bad",
      year: 2008,
      genres: ["Drama", "Crime"],
      sourceUrl: "https://www.themoviedb.org/tv/1396",
      imageUrl: "/covers/placeholder.svg",
    });
  });
});

describe("searchTmdbMovies", () => {
  test("requests the movie endpoint with key, encoded query, and page", async () => {
    await searchTmdbMovies("dark knight", 2);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/search/movie");
    expect(requests[0]).toContain("api_key=test-key");
    expect(requests[0]).toContain("query=dark+knight");
    expect(requests[0]).toContain("page=2");
  });

  test("returns mapped items and hasMore from total_pages", async () => {
    const result = await searchTmdbMovies("inception", 1);
    expect(result.items[0].title).toBe("Inception");
    expect(result.page).toBe(1);
    expect(result.hasMore).toBe(true);
  });

  test("hasMore is false on the final page", async () => {
    const result = await searchTmdbMovies("inception", 3);
    expect(result.hasMore).toBe(false);
  });

  test("throws SourceUpstreamError when TMDB responds with an error", async () => {
    nextStatus = 500;
    await expect(searchTmdbMovies("inception", 1)).rejects.toThrow(
      SourceUpstreamError,
    );
  });

  test("throws SourceConfigError when no API key is configured", async () => {
    const saved = process.env.TMDB_API_KEY;
    delete process.env.TMDB_API_KEY;
    await expect(searchTmdbMovies("inception", 1)).rejects.toThrow(
      SourceConfigError,
    );
    process.env.TMDB_API_KEY = saved;
  });
});

describe("searchTmdbTv", () => {
  test("requests the tv endpoint and maps results", async () => {
    const result = await searchTmdbTv("breaking", 1);
    expect(requests[0]).toContain("/search/tv");
    expect(result.items[0].category).toBe("shows");
    expect(result.hasMore).toBe(false); // total_pages == page in fixture
  });
});
