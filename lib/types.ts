import type { Timestamp } from "firebase/firestore";

// "shows" merges live-action TV and anime into one shelf, searched
// across both TMDB TV and AniList.
export type MediaCategory = "movie" | "shows" | "music" | "game" | "book";

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
  picks: MediaItem[]; // max length 5, ordered
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
