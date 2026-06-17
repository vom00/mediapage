import { describe, expect, test } from "vitest";
import {
  movePick,
  sanitizeMediaItem,
  SHELF_CAPACITY,
  SHELF_PREVIEW_COUNT,
  WATCHLIST,
} from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";

const item = (id: string): MediaItem => ({
  id,
  source: "tmdb",
  sourceId: id,
  category: "movie",
  title: `Title ${id}`,
  imageUrl: "/covers/placeholder.svg",
});

describe("shelf constants", () => {
  test("features five picks per shelf before See all", () => {
    expect(SHELF_PREVIEW_COUNT).toBe(5);
  });

  test("caps each shelf at a safe ceiling above the preview count", () => {
    expect(SHELF_CAPACITY).toBe(100);
    expect(SHELF_CAPACITY).toBeGreaterThan(SHELF_PREVIEW_COUNT);
  });

  test("watchlist is its own shelf key", () => {
    expect(WATCHLIST).toBe("watchlist");
  });
});

describe("movePick", () => {
  test("moves a pick forward", () => {
    const picks = [item("a"), item("b"), item("c")];
    const result = movePick(picks, 0, 2);
    expect(result.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  test("moves a pick backward", () => {
    const picks = [item("a"), item("b"), item("c")];
    const result = movePick(picks, 2, 0);
    expect(result.map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  test("returns the same order when indexes are equal", () => {
    const picks = [item("a"), item("b")];
    expect(movePick(picks, 1, 1).map((p) => p.id)).toEqual(["a", "b"]);
  });

  test("clamps out-of-range targets instead of dropping items", () => {
    const picks = [item("a"), item("b"), item("c")];
    expect(movePick(picks, 0, 99).map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(movePick(picks, 2, -5).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });

  test("does not mutate the input array", () => {
    const picks = [item("a"), item("b")];
    movePick(picks, 0, 1);
    expect(picks.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("sanitizeMediaItem", () => {
  test("drops undefined optional fields so Firestore accepts the write", () => {
    const raw: MediaItem = {
      ...item("x"),
      subtitle: undefined,
      year: undefined,
      synopsis: undefined,
      genres: undefined,
      sourceUrl: undefined,
    };
    const clean = sanitizeMediaItem(raw);
    expect(Object.keys(clean)).toEqual([
      "id",
      "source",
      "sourceId",
      "category",
      "title",
      "imageUrl",
    ]);
  });

  test("keeps defined optional fields", () => {
    const clean = sanitizeMediaItem({
      ...item("y"),
      year: 1999,
      subtitle: "Someone",
    });
    expect(clean.year).toBe(1999);
    expect(clean.subtitle).toBe("Someone");
  });
});
