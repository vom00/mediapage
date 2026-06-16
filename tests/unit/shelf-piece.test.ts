import { describe, expect, test } from "vitest";
import { PIECE_ASPECT, pieceKind } from "@/lib/shelf-piece";
import type { MediaCategory } from "@/lib/types";

describe("pieceKind", () => {
  test("movies stand as blu-ray cases", () => {
    expect(pieceKind("movie")).toBe("bluray");
  });

  test("shows are an iPad-style tablet", () => {
    expect(pieceKind("shows")).toBe("tablet");
  });

  test("music is a vinyl record", () => {
    expect(pieceKind("music")).toBe("vinyl");
  });

  test("video games are game cases", () => {
    expect(pieceKind("game")).toBe("game");
  });

  test("books are books", () => {
    expect(pieceKind("book")).toBe("book");
  });
});

describe("PIECE_ASPECT", () => {
  const categories: MediaCategory[] = [
    "movie",
    "shows",
    "music",
    "game",
    "book",
  ];

  test("every category has an aspect-ratio class", () => {
    for (const category of categories) {
      expect(PIECE_ASPECT[category]).toMatch(/^aspect-/);
    }
  });

  test("vinyl is square, the tablet and other pieces are portrait", () => {
    expect(PIECE_ASPECT.music).toBe("aspect-square");
    expect(PIECE_ASPECT.shows).toBe("aspect-[3/4]");
    expect(PIECE_ASPECT.movie).toBe("aspect-[2/3]");
    expect(PIECE_ASPECT.game).toBe("aspect-[2/3]");
    expect(PIECE_ASPECT.book).toBe("aspect-[2/3]");
  });
});
