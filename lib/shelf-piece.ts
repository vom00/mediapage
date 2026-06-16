import type { MediaCategory } from "@/lib/types";

// Each shelf renders its picks as a category-specific physical
// object. This maps the category to its form factor.
export type PieceKind = "bluray" | "tablet" | "vinyl" | "game" | "book";

export function pieceKind(category: MediaCategory): PieceKind {
  switch (category) {
    case "movie":
      return "bluray";
    case "shows":
      return "tablet";
    case "music":
      return "vinyl";
    case "game":
      return "game";
    case "book":
      return "book";
  }
}

// The shape each object occupies on the shelf: vinyl is a square
// (the round record), the Shows tablet is an iPad-style portrait,
// cases and books are portrait. Applied to filled pieces and empty
// slots alike so a shelf stays even.
export const PIECE_ASPECT: Record<MediaCategory, string> = {
  movie: "aspect-[2/3]",
  shows: "aspect-[3/4]",
  music: "aspect-square",
  game: "aspect-[2/3]",
  book: "aspect-[2/3]",
};
