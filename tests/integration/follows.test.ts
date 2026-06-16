// @vitest-environment node
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  approveFollowRequest,
  declineFollowRequest,
  fetchFeed,
  fetchFollowedUids,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRequests,
  follow,
  followEdgeId,
  isFollowing,
  unfollow,
  type FollowActor,
} from "@/lib/follows";
import { claimProfile } from "@/lib/profile";
import { postRecommendation } from "@/lib/recommendations";
import type { MediaItem } from "@/lib/types";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

// The emulator phrases a read denied by a get()-based rule clause as
// "evaluation error ... for 'get'"; both are permission denials.
const DENIED = /insufficient permissions|PERMISSION_DENIED|evaluation error/i;

const ITEM: MediaItem = {
  id: "tmdb:1",
  source: "tmdb",
  sourceId: "1",
  category: "movie",
  title: "Feed Movie",
  imageUrl: "/covers/placeholder.svg",
};

describe("follows and the home feed", () => {
  let fan: TestClient;
  let creatorA: TestClient;
  let creatorB: TestClient;
  let fanUid: string;
  let aUid: string;
  let bUid: string;
  let fanActor: FollowActor;

  beforeEach(async () => {
    await clearEmulatorData();
    fan = createTestClient();
    creatorA = createTestClient();
    creatorB = createTestClient();
    fanUid = (await signUpTestUser(fan.auth)).uid;
    await claimProfile(fan.db, fanUid, { handle: "fan", displayName: "Fan" });
    fanActor = { uid: fanUid, handle: "fan", displayName: "Fan" };
    aUid = (await signUpTestUser(creatorA.auth)).uid;
    await claimProfile(creatorA.db, aUid, {
      handle: "creator_a",
      displayName: "Creator A",
    });
    bUid = (await signUpTestUser(creatorB.auth)).uid;
    await claimProfile(creatorB.db, bUid, {
      handle: "creator_b",
      displayName: "Creator B",
    });
  });

  afterEach(async () => {
    await destroyTestClient(fan);
    await destroyTestClient(creatorA);
    await destroyTestClient(creatorB);
  });

  test("following a public account is instant, and unfollow removes it", async () => {
    await follow(fan.db, fanActor, aUid, true);
    expect(await isFollowing(fan.db, fanUid, aUid)).toBe(true);
    const snap = await getDoc(doc(fan.db, "follows", followEdgeId(fanUid, aUid)));
    expect(snap.data()?.approved).toBe(true);
    await unfollow(fan.db, fanUid, aUid);
    expect(await isFollowing(fan.db, fanUid, aUid)).toBe(false);
  });

  test("rules: cannot forge an edge for someone else", async () => {
    await expect(
      setDoc(doc(fan.db, "follows", followEdgeId(aUid, bUid)), {
        followerUid: aUid,
        followedUid: bUid,
        requester: { handle: "creator_a", displayName: "Creator A" },
        approved: true,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: cannot forge a requester stamp that isn't yours", async () => {
    await expect(
      setDoc(doc(fan.db, "follows", followEdgeId(fanUid, aUid)), {
        followerUid: fanUid,
        followedUid: aUid,
        requester: { handle: "creator_a", displayName: "Creator A" },
        approved: true,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: cannot follow yourself", async () => {
    await expect(follow(fan.db, fanActor, fanUid, true)).rejects.toThrow(
      /yourself|PERMISSION_DENIED|insufficient/i,
    );
  });

  test("rules: cannot remove someone else's follow edge", async () => {
    await follow(fan.db, fanActor, aUid, true);
    await expect(
      deleteDoc(doc(creatorB.db, "follows", followEdgeId(fanUid, aUid))),
    ).rejects.toThrow(DENIED);
  });

  test("follower and following lists hydrate approved edges", async () => {
    await follow(fan.db, fanActor, aUid, true);
    await follow(fan.db, fanActor, bUid, true);

    const followersOfA = await fetchFollowers(fan.db, aUid);
    expect(followersOfA.map((p) => p.handle)).toEqual(["fan"]);

    const fanFollowing = await fetchFollowing(fan.db, fanUid);
    expect(fanFollowing.map((p) => p.handle).sort()).toEqual([
      "creator_a",
      "creator_b",
    ]);
  });

  test("the feed merges followed users' recommendations newest first", async () => {
    await postRecommendation(
      creatorA.db,
      { uid: aUid, handle: "creator_a", displayName: "Creator A" },
      ITEM,
      "Oldest note",
      false,
    );
    await postRecommendation(
      creatorB.db,
      { uid: bUid, handle: "creator_b", displayName: "Creator B" },
      { ...ITEM, id: "tmdb:2", sourceId: "2", title: "Second Movie" },
      "Middle note",
      false,
    );
    await postRecommendation(
      creatorA.db,
      { uid: aUid, handle: "creator_a", displayName: "Creator A" },
      { ...ITEM, id: "tmdb:3", sourceId: "3", title: "Third Movie" },
      "Newest note",
      false,
    );

    await follow(fan.db, fanActor, aUid, true);
    await follow(fan.db, fanActor, bUid, true);

    const feed = await fetchFeed(fan.db, [aUid, bUid]);
    expect(feed.map((r) => r.note)).toEqual([
      "Newest note",
      "Middle note",
      "Oldest note",
    ]);

    // An empty following list yields an empty feed, not an error.
    expect(await fetchFeed(fan.db, [])).toEqual([]);
  });
});

describe("follow approval flow for private accounts", () => {
  let owner: TestClient; // private account
  let follower: TestClient; // public
  let other: TestClient; // public
  let ownerUid: string;
  let followerUid: string;
  let otherUid: string;
  let followerActor: FollowActor;
  let otherActor: FollowActor;

  beforeEach(async () => {
    await clearEmulatorData();
    owner = createTestClient();
    follower = createTestClient();
    other = createTestClient();

    ownerUid = (await signUpTestUser(owner.auth)).uid;
    await claimProfile(owner.db, ownerUid, {
      handle: "owner",
      displayName: "Owner",
    });
    // Make the owner's profile followers-only.
    await updateDoc(doc(owner.db, "users", ownerUid), { isPublic: false });

    followerUid = (await signUpTestUser(follower.auth)).uid;
    await claimProfile(follower.db, followerUid, {
      handle: "follower",
      displayName: "Follower",
    });
    followerActor = {
      uid: followerUid,
      handle: "follower",
      displayName: "Follower",
    };

    otherUid = (await signUpTestUser(other.auth)).uid;
    await claimProfile(other.db, otherUid, {
      handle: "other",
      displayName: "Other",
    });
    otherActor = { uid: otherUid, handle: "other", displayName: "Other" };
  });

  afterEach(async () => {
    await destroyTestClient(owner);
    await destroyTestClient(follower);
    await destroyTestClient(other);
  });

  test("a pending request grants no read access to the private profile", async () => {
    await follow(follower.db, followerActor, ownerUid, false);

    const edge = await getDoc(
      doc(follower.db, "follows", followEdgeId(followerUid, ownerUid)),
    );
    expect(edge.exists()).toBe(true);
    expect(edge.data()?.approved).toBe(false);

    // The private profile and its shelves stay unreadable while pending.
    await expect(
      getDoc(doc(follower.db, "users", ownerUid)),
    ).rejects.toThrow(DENIED);
    await expect(
      getDoc(doc(follower.db, "users", ownerUid, "shelves", "movie")),
    ).rejects.toThrow(DENIED);
  });

  test("rules: cannot create a pre-approved request for a private account", async () => {
    await expect(
      setDoc(doc(follower.db, "follows", followEdgeId(followerUid, ownerUid)), {
        followerUid,
        followedUid: ownerUid,
        requester: { handle: "follower", displayName: "Follower" },
        approved: true, // self-granting access — must be rejected
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("the owner approves a request, unlocking the private profile", async () => {
    await follow(follower.db, followerActor, ownerUid, false);
    await approveFollowRequest(owner.db, followerUid, ownerUid);

    const snap = await getDoc(doc(follower.db, "users", ownerUid));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.handle).toBe("owner");
  });

  test("a follower cannot approve their own request", async () => {
    await follow(follower.db, followerActor, ownerUid, false);
    await expect(
      approveFollowRequest(follower.db, followerUid, ownerUid),
    ).rejects.toThrow(DENIED);

    // Still no access after the failed self-approval.
    await expect(
      getDoc(doc(follower.db, "users", ownerUid)),
    ).rejects.toThrow(DENIED);
  });

  test("the owner can decline a pending request", async () => {
    await follow(follower.db, followerActor, ownerUid, false);
    await declineFollowRequest(owner.db, followerUid, ownerUid);
    expect(await isFollowing(follower.db, followerUid, ownerUid)).toBe(false);
  });

  test("the owner can remove an approved follower", async () => {
    await follow(follower.db, followerActor, ownerUid, false);
    await approveFollowRequest(owner.db, followerUid, ownerUid);
    await declineFollowRequest(owner.db, followerUid, ownerUid);
    expect(await isFollowing(follower.db, followerUid, ownerUid)).toBe(false);
  });

  test("fetchFollowRequests lists pending requesters and drops approved ones", async () => {
    await follow(follower.db, followerActor, ownerUid, false);
    await follow(other.db, otherActor, ownerUid, false);

    const pending = await fetchFollowRequests(owner.db, ownerUid);
    expect(pending.map((r) => r.requester.handle).sort()).toEqual([
      "follower",
      "other",
    ]);

    await approveFollowRequest(owner.db, followerUid, ownerUid);
    const stillPending = await fetchFollowRequests(owner.db, ownerUid);
    expect(stillPending.map((r) => r.requester.handle)).toEqual(["other"]);
  });

  test("approved-only lists: pending follows are excluded from feed sources and follower lists", async () => {
    // Follower requests the private owner (pending) and follows the
    // public account (instant).
    await follow(follower.db, followerActor, ownerUid, false);
    await follow(follower.db, followerActor, otherUid, true);

    const followed = await fetchFollowedUids(follower.db, followerUid);
    expect(followed).toEqual([otherUid]);

    const ownerFollowers = await fetchFollowers(owner.db, ownerUid);
    expect(ownerFollowers).toEqual([]);

    await approveFollowRequest(owner.db, followerUid, ownerUid);
    const afterApproval = await fetchFollowedUids(follower.db, followerUid);
    expect(afterApproval.sort()).toEqual([otherUid, ownerUid].sort());
  });
});
