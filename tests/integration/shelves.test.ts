// @vitest-environment node
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimProfile, resolveHandle } from "@/lib/profile";
import {
  addPick,
  DuplicatePickError,
  removePick,
  setShelfPicks,
  SHELF_CAPACITY,
  ShelfFullError,
  WATCHLIST,
} from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

const DENIED = /insufficient permissions|PERMISSION_DENIED/i;

const pick = (id: string): MediaItem => ({
  id: `tmdb:${id}`,
  source: "tmdb",
  sourceId: id,
  category: "movie",
  title: `Movie ${id}`,
  imageUrl: "/covers/placeholder.svg",
  year: 2000,
});

describe("shelves", () => {
  let owner: TestClient;
  let other: TestClient;
  let anon: TestClient;
  let ownerUid: string;

  beforeEach(async () => {
    await clearEmulatorData();
    owner = createTestClient();
    other = createTestClient();
    anon = createTestClient();
    const user = await signUpTestUser(owner.auth);
    ownerUid = user.uid;
    await claimProfile(owner.db, ownerUid, {
      handle: "shelfowner",
      displayName: "Shelf Owner",
    });
  });

  afterEach(async () => {
    await destroyTestClient(owner);
    await destroyTestClient(other);
    await destroyTestClient(anon);
  });

  test("addPick creates the shelf and appends in order", async () => {
    await addPick(owner.db, ownerUid, pick("1"));
    await addPick(owner.db, ownerUid, pick("2"));
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect(snap.exists()).toBe(true);
    const data = snap.data() as { picks: MediaItem[] };
    expect(data.picks.map((p) => p.id)).toEqual(["tmdb:1", "tmdb:2"]);
  });

  test("addPick rejects duplicates", async () => {
    await addPick(owner.db, ownerUid, pick("1"));
    await expect(addPick(owner.db, ownerUid, pick("1"))).rejects.toThrow(
      DuplicatePickError,
    );
  });

  test("addPick allows more than five picks now", async () => {
    for (let i = 1; i <= 6; i++) {
      await addPick(owner.db, ownerUid, pick(String(i)));
    }
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect((snap.data() as { picks: MediaItem[] }).picks).toHaveLength(6);
  });

  test("addPick blocks the pick past capacity with ShelfFullError", async () => {
    const full = Array.from({ length: SHELF_CAPACITY }, (_, i) =>
      pick(String(i + 1)),
    );
    await setShelfPicks(owner.db, ownerUid, "movie", full);
    await expect(
      addPick(owner.db, ownerUid, pick("overflow")),
    ).rejects.toThrow(ShelfFullError);
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect((snap.data() as { picks: MediaItem[] }).picks).toHaveLength(
      SHELF_CAPACITY,
    );
  });

  test("addPick can file mixed media onto the watchlist", async () => {
    const game: MediaItem = {
      id: "igdb:1",
      source: "igdb",
      sourceId: "1",
      category: "game",
      title: "Elden Ring",
      imageUrl: "/covers/placeholder.svg",
    };
    await addPick(owner.db, ownerUid, game, WATCHLIST);
    const snap = await getDoc(
      doc(owner.db, "users", ownerUid, "shelves", "watchlist"),
    );
    expect(snap.exists()).toBe(true);
    const data = snap.data() as { category: string; picks: MediaItem[] };
    expect(data.category).toBe("watchlist");
    // The item keeps its own media category so it renders as a game.
    expect(data.picks[0].category).toBe("game");
  });

  test("setShelfPicks persists a reorder", async () => {
    await addPick(owner.db, ownerUid, pick("1"));
    await addPick(owner.db, ownerUid, pick("2"));
    await setShelfPicks(owner.db, ownerUid, "movie", [pick("2"), pick("1")]);
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect((snap.data() as { picks: MediaItem[] }).picks.map((p) => p.id)).toEqual([
      "tmdb:2",
      "tmdb:1",
    ]);
  });

  test("removePick deletes a single pick", async () => {
    await addPick(owner.db, ownerUid, pick("1"));
    await addPick(owner.db, ownerUid, pick("2"));
    await removePick(owner.db, ownerUid, "movie", "tmdb:1");
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect((snap.data() as { picks: MediaItem[] }).picks.map((p) => p.id)).toEqual([
      "tmdb:2",
    ]);
  });

  test("rules: another user cannot write my shelf", async () => {
    await signUpTestUser(other.auth);
    await expect(
      setDoc(doc(other.db, "users", ownerUid, "shelves", "movie"), {
        uid: ownerUid,
        category: "movie",
        picks: [pick("1")],
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: a lying client cannot store more than the capacity", async () => {
    const overCap = Array.from({ length: SHELF_CAPACITY + 1 }, (_, i) =>
      pick(String(i + 1)),
    );
    await expect(
      setDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"), {
        uid: ownerUid,
        category: "movie",
        picks: overCap,
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: storing more than five picks is allowed now", async () => {
    const six = [1, 2, 3, 4, 5, 6].map((n) => pick(String(n)));
    await setDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"), {
      uid: ownerUid,
      category: "movie",
      picks: six,
    });
    const snap = await getDoc(doc(owner.db, "users", ownerUid, "shelves", "movie"));
    expect((snap.data() as { picks: MediaItem[] }).picks).toHaveLength(6);
  });

  test("rules: the watchlist shelf is accepted", async () => {
    await setDoc(doc(owner.db, "users", ownerUid, "shelves", "watchlist"), {
      uid: ownerUid,
      category: "watchlist",
      picks: [pick("1")],
    });
    const snap = await getDoc(
      doc(owner.db, "users", ownerUid, "shelves", "watchlist"),
    );
    expect(snap.exists()).toBe(true);
  });

  test("rules: unknown shelf categories are rejected", async () => {
    await expect(
      setDoc(doc(owner.db, "users", ownerUid, "shelves", "podcast"), {
        uid: ownerUid,
        category: "podcast",
        picks: [pick("1")],
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: shelves are publicly readable", async () => {
    await addPick(owner.db, ownerUid, pick("1"));
    const snap = await getDoc(doc(anon.db, "users", ownerUid, "shelves", "movie"));
    expect(snap.exists()).toBe(true);
  });

  test("resolveHandle maps a handle to its uid", async () => {
    expect(await resolveHandle(anon.db, "shelfowner")).toBe(ownerUid);
    expect(await resolveHandle(anon.db, "nobody")).toBeNull();
  });
});
