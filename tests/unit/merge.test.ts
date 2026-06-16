import { describe, expect, test } from "vitest";
import { mergeSearchResults } from "@/lib/sources/merge";
import type { SearchPage } from "@/lib/sources/types";
import type { MediaItem } from "@/lib/types";

const item = (id: string): MediaItem => ({
  id,
  source: "openlibrary",
  sourceId: id,
  category: "book",
  title: id,
  imageUrl: "/covers/placeholder.svg",
});

const ok = (items: string[], hasMore = false): PromiseFulfilledResult<SearchPage> => ({
  status: "fulfilled",
  value: { items: items.map(item), page: 1, hasMore },
});

const fail = (reason: unknown): PromiseRejectedResult => ({
  status: "rejected",
  reason,
});

describe("mergeSearchResults", () => {
  test("interleaves fulfilled sources round-robin", () => {
    const merged = mergeSearchResults([ok(["a1", "a2"]), ok(["b1", "b2"])], 1);
    expect(merged.items.map((i) => i.id)).toEqual(["a1", "b1", "a2", "b2"]);
  });

  test("handles uneven source lengths", () => {
    const merged = mergeSearchResults([ok(["a1"]), ok(["b1", "b2"])], 1);
    expect(merged.items.map((i) => i.id)).toEqual(["a1", "b1", "b2"]);
  });

  test("skips a rejected source and returns the other", () => {
    const merged = mergeSearchResults([fail(new Error("down")), ok(["b1"])], 2);
    expect(merged.items.map((i) => i.id)).toEqual(["b1"]);
    expect(merged.page).toBe(2);
  });

  test("hasMore is true when any surviving source has more", () => {
    expect(mergeSearchResults([ok(["a"], false), ok(["b"], true)], 1).hasMore).toBe(
      true,
    );
    expect(
      mergeSearchResults([ok(["a"], false), ok(["b"], false)], 1).hasMore,
    ).toBe(false);
  });

  test("throws the first rejection when every source fails", () => {
    const boom = new Error("first");
    expect(() =>
      mergeSearchResults([fail(boom), fail(new Error("second"))], 1),
    ).toThrow(boom);
  });
});
