// The five stations of the room, in walk order. Shared by the DOM
// (captions, index) and the 3D scene (lights, camera stops), so
// the copy and the camera can never drift apart.

import type { MediaCategory } from "@/lib/types";

export type Station = {
  name: string;
  /** The library category this shelf collects. */
  category: MediaCategory;
  line: string;
  /** CSS custom property carrying the shelf hue. */
  hueVar: string;
  /** The same hue as a literal, for WebGL (which cannot read CSS). */
  hue: string;
  /** Scroll progress (0–1 through the walk) where the camera settles. */
  at: number;
};

export const STATIONS: Station[] = [
  {
    name: "Movies",
    category: "movie",
    line: "First viewings, lifetime favorites",
    hueVar: "var(--shelf-movies)",
    hue: "#ff6f59",
    at: 0.17,
  },
  {
    name: "Shows",
    category: "shows",
    line: "Series and anime you never stopped thinking about",
    hueVar: "var(--shelf-shows)",
    hue: "#5fb3ff",
    at: 0.33,
  },
  {
    name: "Music",
    category: "music",
    line: "Records that rewired you",
    hueVar: "var(--shelf-music)",
    hue: "#5fd6a4",
    at: 0.49,
  },
  {
    name: "Video Games",
    category: "game",
    line: "Worlds you lived in",
    hueVar: "var(--shelf-games)",
    hue: "#ff7ac0",
    at: 0.65,
  },
  {
    name: "Books",
    category: "book",
    line: "Novels and manga, spines cracked from rereading",
    hueVar: "var(--shelf-books)",
    hue: "#e8d9b5",
    at: 0.81,
  },
];

/** Half-width of the scroll window in which a station's caption shows. */
export const CAPTION_SPAN = 0.06;
/** Where the camera starts pulling back for the finale. */
export const FINALE_AT = 0.88;
