// Open Library adapter for books. No API key. Covers come from
// covers.openlibrary.org by cover id.

import type { MediaItem } from "@/lib/types";
import {
  PLACEHOLDER_COVER,
  SourceUpstreamError,
  type SearchPage,
} from "@/lib/sources/types";

const PAGE_SIZE = 20;

interface OpenLibraryDoc {
  key: string; // "/works/OL27448W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

function coverBase(): string {
  return process.env.OPENLIBRARY_COVER_BASE ?? "https://covers.openlibrary.org";
}

export function mapOpenLibraryDoc(raw: OpenLibraryDoc): MediaItem {
  const workId = raw.key.replace("/works/", "");
  return {
    id: `openlibrary:${workId}`,
    source: "openlibrary",
    sourceId: workId,
    category: "book",
    title: raw.title,
    subtitle: raw.author_name?.[0],
    year: raw.first_publish_year,
    imageUrl: raw.cover_i
      ? `${coverBase()}/b/id/${raw.cover_i}-M.jpg`
      : PLACEHOLDER_COVER,
    sourceUrl: `https://openlibrary.org${raw.key}`,
  };
}

export async function searchBooks(
  query: string,
  page: number,
): Promise<SearchPage> {
  const base = process.env.OPENLIBRARY_BASE_URL ?? "https://openlibrary.org";
  const url = new URL(`${base}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i",
  );

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new SourceUpstreamError("Open Library", response.status);
  }
  const json = (await response.json()) as {
    numFound: number;
    docs: OpenLibraryDoc[];
  };
  return {
    items: json.docs.map(mapOpenLibraryDoc),
    page,
    hasMore: page * PAGE_SIZE < json.numFound,
  };
}
