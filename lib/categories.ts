import type { MediaCategory, MediaSource } from "@/lib/types";

// Display names for the five media shelves, in canonical order.
// (The sixth shelf, the watchlist, is defined in lib/shelves.ts.)
export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  movie: "Movies",
  shows: "Shows",
  music: "Music",
  game: "Video Games",
  book: "Books",
};

export const CATEGORY_ORDER: MediaCategory[] = [
  "movie",
  "shows",
  "music",
  "game",
  "book",
];

export const SOURCE_NAMES: Record<MediaSource, string> = {
  tmdb: "TMDB",
  anilist: "AniList",
  jikan: "MyAnimeList",
  steam: "Steam",
  rawg: "RAWG",
  igdb: "IGDB",
  openlibrary: "Open Library",
  googlebooks: "Google Books",
  spotify: "Spotify",
  deezer: "Deezer",
  musicbrainz: "MusicBrainz",
};
