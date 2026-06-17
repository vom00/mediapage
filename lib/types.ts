import type { Timestamp } from "firebase/firestore";

// "shows" merges live-action TV and anime into one shelf, searched
// across both TMDB TV and AniList.
export type MediaCategory = "movie" | "shows" | "music" | "game" | "book";

// How the shelves are arranged when viewing a profile. "stacked" is the
// default scrolling column of full shelves; "grid" is the compact
// one-page two-column view. This is a per-viewer display preference
// (remembered in the browser), not a property of the profile itself.
export type ProfileLayout = "stacked" | "grid";

export type MediaSource =
  | "tmdb"
  | "anilist"
  | "jikan"
  | "steam"
  | "rawg"
  | "igdb"
  | "openlibrary"
  | "googlebooks"
  | "spotify"
  | "deezer"
  | "musicbrainz";

export interface MediaItem {
  id: string; // `${source}:${sourceId}` — stable, deduped
  source: MediaSource;
  sourceId: string;
  category: MediaCategory;
  title: string;
  subtitle?: string; // director | artist | author | studio | platform
  year?: number;
  imageUrl: string; // never empty — monochrome placeholder if missing
  synopsis?: string;
  genres?: string[];
  sourceUrl?: string; // attribution backlink to the source page
}

export interface UserProfile {
  uid: string;
  handle: string; // unique, lowercased
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isPublic: boolean;
  defaultCommentsOn: boolean;
  deleted?: boolean; // soft delete: hidden, never destroyed
  createdAt: Timestamp;
}

export interface FavoriteShelf {
  uid: string;
  category: MediaCategory;
  picks: MediaItem[]; // ordered; the first five are featured on the profile
}

export interface Recommendation {
  id: string;
  uid: string; // author
  item: MediaItem;
  note: string;
  commentsEnabled: boolean;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  recommendationId: string;
  uid: string;
  body: string;
  createdAt: Timestamp;
}

export interface FollowEdge {
  // doc id: `${followerUid}_${followedUid}`
  followerUid: string;
  followedUid: string;
  createdAt: Timestamp;
}
