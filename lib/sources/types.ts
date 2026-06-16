import type { MediaItem } from "@/lib/types";

// Every media source adapter returns this shape so the API layer
// and UI never see source-specific fields.
export interface SearchPage {
  items: MediaItem[];
  page: number;
  hasMore: boolean;
}

// The server is missing configuration (e.g. an API key).
export class SourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceConfigError";
  }
}

// The upstream API failed or answered with an error status.
export class SourceUpstreamError extends Error {
  constructor(source: string, status: number) {
    super(`${source} responded with status ${status}`);
    this.name = "SourceUpstreamError";
  }
}

// Cover used whenever a source has no artwork; never ship an empty
// imageUrl.
export const PLACEHOLDER_COVER = "/covers/placeholder.svg";
