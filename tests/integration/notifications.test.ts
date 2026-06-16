// @vitest-environment node
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { approveFollowRequest, follow, type FollowActor } from "@/lib/follows";
import {
  countUnread,
  fetchNotifications,
  fetchNotificationsSeenAt,
  markNotificationsSeen,
} from "@/lib/notifications";
import { claimProfile } from "@/lib/profile";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

// The emulator phrases denials a few ways: a standard PERMISSION_DENIED,
// an "evaluation error" when a get()-based clause throws, or a plain
// "false for 'get'" when a boolean read rule cleanly rejects. All mean
// denied.
const DENIED =
  /insufficient permissions|PERMISSION_DENIED|evaluation error|false for '/i;

describe("notifications", () => {
  let owner: TestClient;
  let follower: TestClient;
  let other: TestClient;
  let stranger: TestClient;
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
    stranger = createTestClient();

    ownerUid = (await signUpTestUser(owner.auth)).uid;
    await claimProfile(owner.db, ownerUid, {
      handle: "owner",
      displayName: "Owner",
    });

    followerUid = (await signUpTestUser(follower.auth)).uid;
    await claimProfile(follower.db, followerUid, {
      handle: "follower",
      displayName: "Follower",
    });
    followerActor = { uid: followerUid, handle: "follower", displayName: "Follower" };

    otherUid = (await signUpTestUser(other.auth)).uid;
    await claimProfile(other.db, otherUid, {
      handle: "other",
      displayName: "Other",
    });
    otherActor = { uid: otherUid, handle: "other", displayName: "Other" };

    await signUpTestUser(stranger.auth);
  });

  afterEach(async () => {
    await destroyTestClient(owner);
    await destroyTestClient(follower);
    await destroyTestClient(other);
    await destroyTestClient(stranger);
  });

  test("a new public follower appears as a follower notification", async () => {
    await follow(follower.db, followerActor, ownerUid, true);

    const notifs = await fetchNotifications(owner.db, ownerUid);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].kind).toBe("follower");
    expect(notifs[0].actor.handle).toBe("follower");
    expect(notifs[0].actor.displayName).toBe("Follower");
  });

  test("a follow request appears as a request notification", async () => {
    await updateDoc(doc(owner.db, "users", ownerUid), { isPublic: false });
    await follow(follower.db, followerActor, ownerUid, false);

    const notifs = await fetchNotifications(owner.db, ownerUid);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].kind).toBe("request");
    expect(notifs[0].actor.handle).toBe("follower");
  });

  test("approving a request promotes it to a follower notification", async () => {
    await updateDoc(doc(owner.db, "users", ownerUid), { isPublic: false });
    await follow(follower.db, followerActor, ownerUid, false);
    expect((await fetchNotifications(owner.db, ownerUid))[0].kind).toBe("request");

    await approveFollowRequest(owner.db, followerUid, ownerUid);
    const after = await fetchNotifications(owner.db, ownerUid);
    expect(after).toHaveLength(1);
    expect(after[0].kind).toBe("follower");
  });

  test("notifications are returned newest first", async () => {
    await follow(follower.db, followerActor, ownerUid, true);
    await follow(other.db, otherActor, ownerUid, true);

    const notifs = await fetchNotifications(owner.db, ownerUid);
    expect(notifs.map((n) => n.actor.handle)).toEqual(["other", "follower"]);
  });

  test("markNotificationsSeen stores a timestamp the owner can read back", async () => {
    expect(await fetchNotificationsSeenAt(owner.db, ownerUid)).toBeNull();
    await markNotificationsSeen(owner.db, ownerUid);
    const seenAt = await fetchNotificationsSeenAt(owner.db, ownerUid);
    expect(seenAt).toBeInstanceOf(Timestamp);
  });

  test("unread: new followers are unread until seen, then only newer ones count", async () => {
    await follow(follower.db, followerActor, ownerUid, true);
    const before = await fetchNotifications(owner.db, ownerUid);
    expect(countUnread(before, null)).toBe(1);

    await markNotificationsSeen(owner.db, ownerUid);
    const seenAt = await fetchNotificationsSeenAt(owner.db, ownerUid);
    expect(countUnread(before, seenAt)).toBe(0);

    // A later follower reads as unread again; the already-seen one stays read.
    await follow(other.db, otherActor, ownerUid, true);
    const after = await fetchNotifications(owner.db, ownerUid);
    expect(after).toHaveLength(2);
    expect(countUnread(after, seenAt)).toBe(1);
  });

  test("rules: a stranger cannot read the owner's seen marker", async () => {
    await markNotificationsSeen(owner.db, ownerUid);
    await expect(
      getDoc(doc(stranger.db, "users", ownerUid, "meta", "notifications")),
    ).rejects.toThrow(DENIED);
  });

  test("rules: a stranger cannot write the owner's seen marker", async () => {
    await expect(
      setDoc(doc(stranger.db, "users", ownerUid, "meta", "notifications"), {
        seenAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules: the seen marker rejects malformed writes", async () => {
    // Extra field beyond the allowlist.
    await expect(
      setDoc(doc(owner.db, "users", ownerUid, "meta", "notifications"), {
        seenAt: serverTimestamp(),
        spoofed: true,
      }),
    ).rejects.toThrow(DENIED);

    // Wrong type for seenAt.
    await expect(
      setDoc(doc(owner.db, "users", ownerUid, "meta", "notifications"), {
        seenAt: "yesterday",
      }),
    ).rejects.toThrow(DENIED);

    // A doc id outside the private meta allowlist.
    await expect(
      setDoc(doc(owner.db, "users", ownerUid, "meta", "secrets"), {
        seenAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });
});
