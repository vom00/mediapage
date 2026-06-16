import { NextResponse } from "next/server";
import { searchCache } from "@/lib/search-cache";
import { clientIp, searchRateLimiter } from "@/lib/search-rate-limit";
import { isMediaCategory, SEARCH_REGISTRY } from "@/lib/sources/registry";
import { SourceConfigError, SourceUpstreamError } from "@/lib/sources/types";

export async function GET(request: Request): Promise<NextResponse> {
  // Per-IP rate limit so the public proxy can't be used to drain our
  // upstream quota. Local/dev requests (no forwarded IP) are exempt.
  const ip = clientIp(request);
  if (ip) {
    const verdict = searchRateLimiter.check(ip);
    if (!verdict.allowed) {
      return NextResponse.json(
        { error: "Too many searches. Please slow down a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
          },
        },
      );
    }
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category") ?? "";
  const pageParam = url.searchParams.get("page") ?? "1";
  const page = Number(pageParam);

  if (!q) {
    return NextResponse.json(
      { error: "Missing search query." },
      { status: 400 },
    );
  }
  if (!isMediaCategory(category)) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json(
      { error: "page must be a positive integer." },
      { status: 400 },
    );
  }

  const search = SEARCH_REGISTRY[category];
  if (!search) {
    return NextResponse.json(
      { error: `Searching ${category} is not available yet.` },
      { status: 501 },
    );
  }

  const cacheKey = `${category}:${page}:${q.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const result = await search(q, page);
    searchCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SourceConfigError) {
      return NextResponse.json(
        {
          error:
            "This source is not configured on the server yet. Add its API key to .env.local.",
        },
        { status: 503 },
      );
    }
    if (error instanceof SourceUpstreamError) {
      return NextResponse.json(
        { error: "The upstream library is having trouble. Try again shortly." },
        { status: 502 },
      );
    }
    throw error;
  }
}
