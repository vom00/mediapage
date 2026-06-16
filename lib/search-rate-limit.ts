import { RateLimiter } from "@/lib/rate-limit";

// Per-IP cap on the public search proxy so nobody can drain our
// upstream API quota (TMDB/RAWG) by hammering it. Generous enough
// for a human typing (debounced) plus infinite scroll; only a bot
// hits it. Overridable via env for tuning per deployment.
export const SEARCH_RATELIMIT_MAX = Number(
  process.env.SEARCH_RATELIMIT_MAX ?? "40",
);
export const SEARCH_RATELIMIT_WINDOW_MS = Number(
  process.env.SEARCH_RATELIMIT_WINDOW_MS ?? "10000",
);

export const searchRateLimiter = new RateLimiter(
  SEARCH_RATELIMIT_MAX,
  SEARCH_RATELIMIT_WINDOW_MS,
);

// The client IP from the proxy's forwarding headers. Local/dev and
// the test runner have no forwarded IP, so they are not limited.
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
