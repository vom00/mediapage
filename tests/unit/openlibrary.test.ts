// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { mapOpenLibraryDoc, searchBooks } from "@/lib/sources/openlibrary";
import { SourceUpstreamError } from "@/lib/sources/types";

const DOC = {
  key: "/works/OL27448W",
  title: "The Lord of the Rings",
  author_name: ["J.R.R. Tolkien", "Other Person"],
  first_publish_year: 1954,
  cover_i: 9255566,
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
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({ numFound: 25, docs: [DOC] }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.OPENLIBRARY_BASE_URL = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  delete process.env.OPENLIBRARY_BASE_URL;
  delete process.env.OPENLIBRARY_COVER_BASE;
});

beforeEach(() => {
  requests = [];
});

describe("mapOpenLibraryDoc", () => {
  test("maps a search doc to a MediaItem", () => {
    const item = mapOpenLibraryDoc(DOC);
    expect(item).toMatchObject({
      id: "openlibrary:OL27448W",
      source: "openlibrary",
      category: "book",
      title: "The Lord of the Rings",
      subtitle: "J.R.R. Tolkien",
      year: 1954,
      sourceUrl: "https://openlibrary.org/works/OL27448W",
    });
    expect(item.imageUrl).toBe(
      "https://covers.openlibrary.org/b/id/9255566-M.jpg",
    );
  });

  test("uses the placeholder when there is no cover id", () => {
    const item = mapOpenLibraryDoc({ ...DOC, cover_i: undefined });
    expect(item.imageUrl).toBe("/covers/placeholder.svg");
  });

  test("honors a cover base override for hermetic tests", () => {
    process.env.OPENLIBRARY_COVER_BASE = "http://127.0.0.1:9999/img";
    const item = mapOpenLibraryDoc(DOC);
    expect(item.imageUrl).toBe("http://127.0.0.1:9999/img/b/id/9255566-M.jpg");
    delete process.env.OPENLIBRARY_COVER_BASE;
  });
});

describe("searchBooks", () => {
  test("requests search.json with query, page, and trimmed fields", async () => {
    const result = await searchBooks("tolkien", 1);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("/search.json");
    expect(requests[0]).toContain("q=tolkien");
    expect(requests[0]).toContain("page=1");
    expect(requests[0]).toContain("limit=20");
    expect(result.items[0].category).toBe("book");
  });

  test("hasMore reflects numFound against the page window", async () => {
    const first = await searchBooks("tolkien", 1);
    expect(first.hasMore).toBe(true); // 25 found, 20 per page
    const second = await searchBooks("tolkien", 2);
    expect(second.hasMore).toBe(false);
  });

  test("throws SourceUpstreamError on failure", async () => {
    nextStatus = 500;
    await expect(searchBooks("tolkien", 1)).rejects.toThrow(
      SourceUpstreamError,
    );
  });
});
