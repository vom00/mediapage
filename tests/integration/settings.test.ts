// @vitest-environment node
import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { follow } from "@/lib/follows";
import { claimProfile, isHandleTaken, resolveHandle } from "@/lib/profile";
import {
  changeHandle,
  setAccountDeleted,
  updateProfileSettings,
} from "@/lib/settings";
import { getShelfPicks, addPick } from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

// The emulator words denials differently depending on whether the
// rule short-circuited or hit an evaluation error; all mean denied.
const DENIED = /insufficient permissions|PERMISSION_DENIED|evaluation error/i;

const PICK: MediaItem = {
  id: "tmdb:1",
  source: "tmdb",
  sourceId: "1",
  category: "movie",
  title: "Private Movie",
  imageUrl: "/covers/placeholder.svg",
};

describe("settings", () => {
  let owner: TestClient;
  let follower: TestClient;
  let stranger: TestClient;
  let ownerUid: string;
  let followerUid: string;

  beforeEach(async () => {
    await clearEmulatorData();
    owner = createTestClient();
    follower = createTestClient();
    stranger = createTestClient();
    ownerUid = (await signUpTestUser(owner.auth)).uid;
    await claimProfile(owner.db, ownerUid, {
      handle: "settler",
      displayName: "Settler",
    });
    followerUid = (await signUpTestUser(follower.auth)).uid;
    await claimProfile(follower.db, followerUid, {
      handle: "loyal",
      displayName: "Loyal",
    });
    await signUpTestUser(stranger.auth);
  });

  afterEach(async () => {
    await destroyTestClient(owner);
    await destroyTestClient(follower);
    await destroyTestClient(stranger);
  });

  test("updates display name, bio, privacy, and default comments", async () => {
    await updateProfileSettings(owner.db, ownerUid, {
      displayName: "Renamed Settler",
      bio: "Six shelves, no regrets.",
      isPublic: true,
      defaultCommentsOn: true,
    });
    const snap = await getDoc(doc(owner.db, "users", ownerUid));
    expect(snap.data()).toMatchObject({
      displayName: "Renamed Settler",
      bio: "Six shelves, no regrets.",
      defaultCommentsOn: true,
    });
  });

  test("changeHandle swaps atomically and frees the old handle", async () => {
    await changeHandle(owner.db, ownerUid, "settler", "wanderer");
    expect(await resolveHandle(owner.db, "wanderer")).toBe(ownerUid);
    expect(await resolveHandle(owner.db, "settler")).toBeNull();
    expect(await isHandleTaken(owner.db, "settler")).toBe(false);

    const snap = await getDoc(doc(owner.db, "users", ownerUid));
    expect(snap.data()?.handle).toBe("wanderer");
  });

  test("changeHandle refuses a taken handle", async () => {
    await expect(
      changeHandle(owner.db, ownerUid, "settler", "loyal"),
    ).rejects.toThrow(/already taken/i);
    // Nothing changed.
    expect(await resolveHandle(owner.db, "settler")).toBe(ownerUid);
  });

  test("rules: you cannot release someone else's handle", async () => {
    // A forged batch that bypasses the client library entirely.
    const batch = writeBatch(follower.db);
    batch.delete(doc(follower.db, "handles", "settler"));
    batch.set(doc(follower.db, "handles", "thief"), { uid: followerUid });
    batch.update(doc(follower.db, "users", followerUid), { handle: "thief" });
    await expect(batch.commit()).rejects.toThrow(DENIED);

    // The library refuses earlier, with a clearer message.
    await expect(
      changeHandle(follower.db, followerUid, "settler", "thief2"),
    ).rejects.toThrow(/only change your own/i);

    expect(await resolveHandle(owner.db, "settler")).toBe(ownerUid);
  });

  test("followers-only: strangers cannot read the profile or shelves, followers can", async () => {
    await addPick(owner.db, ownerUid, PICK);
    // Followed while public (instantly approved); the owner then goes
    // private. An already-approved follower keeps access.
    await follow(
      follower.db,
      { uid: followerUid, handle: "loyal", displayName: "Loyal" },
      ownerUid,
      true,
    );
    await updateProfileSettings(owner.db, ownerUid, { isPublic: false });

    // Stranger: denied on both.
    await expect(
      getDoc(doc(stranger.db, "users", ownerUid)),
    ).rejects.toThrow(DENIED);
    await expect(
      getDoc(doc(stranger.db, "users", ownerUid, "shelves", "movie")),
    ).rejects.toThrow(DENIED);

    // Follower: allowed on both.
    const profileSnap = await getDoc(doc(follower.db, "users", ownerUid));
    expect(profileSnap.exists()).toBe(true);
    expect(await getShelfPicks(follower.db, ownerUid, "movie")).toHaveLength(1);

    // Owner still reads their own.
    const own = await getDoc(doc(owner.db, "users", ownerUid));
    expect(own.exists()).toBe(true);
  });

  test("soft delete marks the account and only the owner can do it", async () => {
    await expect(
      setAccountDeleted(follower.db, ownerUid, true),
    ).rejects.toThrow(DENIED);

    await setAccountDeleted(owner.db, ownerUid, true);
    const snap = await getDoc(doc(owner.db, "users", ownerUid));
    expect(snap.data()?.deleted).toBe(true);

    // Reactivation works the same way.
    await setAccountDeleted(owner.db, ownerUid, false);
    const restored = await getDoc(doc(owner.db, "users", ownerUid));
    expect(restored.data()?.deleted).toBe(false);
  });

  test("rules: strangers cannot edit settings fields at all", async () => {
    await expect(
      updateDoc(doc(stranger.db, "users", ownerUid), { bio: "Hacked" }),
    ).rejects.toThrow(DENIED);
  });
});
