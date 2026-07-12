// @vitest-environment node
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { follow, followEdgeId } from "@/lib/follows";
import { claimProfile } from "@/lib/profile";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

const DENIED = /insufficient permissions|PERMISSION_DENIED/i;

describe("firestore security rules: users and handles", () => {
  let clientA: TestClient;
  let clientB: TestClient;
  let anon: TestClient;

  beforeEach(async () => {
    await clearEmulatorData();
    clientA = createTestClient();
    clientB = createTestClient();
    anon = createTestClient();
  });

  afterEach(async () => {
    await destroyTestClient(clientA);
    await destroyTestClient(clientB);
    await destroyTestClient(anon);
  });

  test("unauthenticated clients cannot create user profiles", async () => {
    await expect(
      setDoc(doc(anon.db, "users", "intruder"), {
        uid: "intruder",
        handle: "intruder",
        displayName: "Intruder",
        isPublic: true,
        defaultCommentsOn: false,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("a signed-in user cannot write someone else's profile", async () => {
    const userA = await signUpTestUser(clientA.auth);
    await claimProfile(clientA.db, userA.uid, {
      handle: "victim",
      displayName: "Victim",
    });

    await signUpTestUser(clientB.auth);
    await expect(
      updateDoc(doc(clientB.db, "users", userA.uid), {
        displayName: "Hacked",
      }),
    ).rejects.toThrow(DENIED);
  });

  test("cannot create a profile without claiming the handle in the same batch", async () => {
    const user = await signUpTestUser(clientA.auth);
    await expect(
      setDoc(doc(clientA.db, "users", user.uid), {
        uid: user.uid,
        handle: "sneaky",
        displayName: "Sneaky",
        isPublic: true,
        defaultCommentsOn: false,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("cannot register a handle pointing at someone else's uid", async () => {
    const user = await signUpTestUser(clientA.auth);
    const batch = writeBatch(clientA.db);
    batch.set(doc(clientA.db, "handles", "stolen"), { uid: "someone-else" });
    batch.set(doc(clientA.db, "users", user.uid), {
      uid: user.uid,
      handle: "stolen",
      displayName: "Thief",
      isPublic: true,
      defaultCommentsOn: false,
      createdAt: serverTimestamp(),
    });
    await expect(batch.commit()).rejects.toThrow(DENIED);
  });

  test("rules reject handles in an invalid format even if the client lies", async () => {
    const user = await signUpTestUser(clientA.auth);
    const batch = writeBatch(clientA.db);
    batch.set(doc(clientA.db, "handles", "Bad Handle"), { uid: user.uid });
    batch.set(doc(clientA.db, "users", user.uid), {
      uid: user.uid,
      handle: "Bad Handle",
      displayName: "Bad",
      isPublic: true,
      defaultCommentsOn: false,
      createdAt: serverTimestamp(),
    });
    await expect(batch.commit()).rejects.toThrow(DENIED);
  });

  test("the handle field is immutable through profile updates", async () => {
    const user = await signUpTestUser(clientA.auth);
    await claimProfile(clientA.db, user.uid, {
      handle: "original",
      displayName: "Original",
    });

    await expect(
      updateDoc(doc(clientA.db, "users", user.uid), { handle: "different" }),
    ).rejects.toThrow(DENIED);

    // Ordinary profile edits stay allowed.
    await updateDoc(doc(clientA.db, "users", user.uid), {
      displayName: "Renamed",
    });
    const snap = await getDoc(doc(clientA.db, "users", user.uid));
    expect(snap.data()?.displayName).toBe("Renamed");
  });

  test("rejects unknown extra fields on profile create", async () => {
    const user = await signUpTestUser(clientA.auth);
    const batch = writeBatch(clientA.db);
    batch.set(doc(clientA.db, "handles", "stuffer"), { uid: user.uid });
    batch.set(doc(clientA.db, "users", user.uid), {
      uid: user.uid,
      handle: "stuffer",
      displayName: "Stuffer",
      isPublic: true,
      defaultCommentsOn: false,
      createdAt: serverTimestamp(),
      isAdmin: true, // not part of the profile schema
    });
    await expect(batch.commit()).rejects.toThrow(DENIED);
  });

  test("rejects unknown extra fields on profile update", async () => {
    const user = await signUpTestUser(clientA.auth);
    await claimProfile(clientA.db, user.uid, {
      handle: "tidy",
      displayName: "Tidy",
    });
    await expect(
      updateDoc(doc(clientA.db, "users", user.uid), { isAdmin: true }),
    ).rejects.toThrow(DENIED);
  });

  test("profiles are publicly readable while signed out", async () => {
    const user = await signUpTestUser(clientA.auth);
    await claimProfile(clientA.db, user.uid, {
      handle: "publicfan",
      displayName: "Public Fan",
    });

    const snap = await getDoc(doc(anon.db, "users", user.uid));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.handle).toBe("publicfan");
  });

  test("reserved handles are rejected even with a direct write", async () => {
    const user = await signUpTestUser(clientA.auth);
    const batch = writeBatch(clientA.db);
    batch.set(doc(clientA.db, "handles", "admin"), { uid: user.uid });
    batch.set(doc(clientA.db, "users", user.uid), {
      uid: user.uid,
      handle: "admin",
      displayName: "Definitely Staff",
      isPublic: true,
      defaultCommentsOn: false,
      createdAt: serverTimestamp(),
    });
    await expect(batch.commit()).rejects.toThrow(DENIED);
  });
});

describe("firestore security rules: pending follow privacy", () => {
  let owner: TestClient;
  let requester: TestClient;
  let stranger: TestClient;
  let anon: TestClient;
  let ownerUid: string;
  let requesterUid: string;

  beforeEach(async () => {
    await clearEmulatorData();
    owner = createTestClient();
    requester = createTestClient();
    stranger = createTestClient();
    anon = createTestClient();

    const o = await signUpTestUser(owner.auth);
    ownerUid = o.uid;
    await claimProfile(owner.db, ownerUid, {
      handle: "quietone",
      displayName: "Quiet One",
    });
    await updateDoc(doc(owner.db, "users", ownerUid), { isPublic: false });

    const r = await signUpTestUser(requester.auth);
    requesterUid = r.uid;
    await claimProfile(requester.db, requesterUid, {
      handle: "hopeful",
      displayName: "Hopeful",
    });

    const s = await signUpTestUser(stranger.auth);
    await claimProfile(stranger.db, s.uid, {
      handle: "nosy",
      displayName: "Nosy",
    });

    await follow(
      requester.db,
      { uid: requesterUid, handle: "hopeful", displayName: "Hopeful" },
      ownerUid,
      false,
    );
  });

  afterEach(async () => {
    await destroyTestClient(owner);
    await destroyTestClient(requester);
    await destroyTestClient(stranger);
    await destroyTestClient(anon);
  });

  test("both parties can read the pending edge", async () => {
    const edge = followEdgeId(requesterUid, ownerUid);
    const byRequester = await getDoc(doc(requester.db, "follows", edge));
    expect(byRequester.data()?.approved).toBe(false);
    const byOwner = await getDoc(doc(owner.db, "follows", edge));
    expect(byOwner.data()?.approved).toBe(false);
  });

  // The emulator reports these denials with rules-diagnostic text
  // rather than the standard message, so assert on the error code.
  const deniedCode = expect.objectContaining({ code: "permission-denied" });

  test("third parties cannot read a pending edge, signed in or not", async () => {
    const edge = followEdgeId(requesterUid, ownerUid);
    await expect(getDoc(doc(stranger.db, "follows", edge))).rejects.toEqual(
      deniedCode,
    );
    await expect(getDoc(doc(anon.db, "follows", edge))).rejects.toEqual(
      deniedCode,
    );
  });

  test("a stranger probing a missing edge is denied the same way", async () => {
    // If absent edges answered "not found" while pending ones answered
    // "denied", the difference would reveal hidden requests.
    await expect(
      getDoc(doc(stranger.db, "follows", followEdgeId(requesterUid, "someone"))),
    ).rejects.toEqual(deniedCode);
  });
});

describe("firestore security rules: recommendation item shape", () => {
  let author: TestClient;
  let authorUid: string;

  const VALID_ITEM = {
    id: "tmdb:1",
    source: "tmdb",
    sourceId: "1",
    category: "movie",
    title: "Paper Moon",
    imageUrl: "https://image.tmdb.org/t/p/w342/p1.jpg",
  };

  function recDoc(item: Record<string, unknown>) {
    return {
      uid: authorUid,
      author: { handle: "poster", displayName: "Poster" },
      item,
      note: "Trust me on this one.",
      commentsEnabled: false,
      createdAt: serverTimestamp(),
    };
  }

  beforeEach(async () => {
    await clearEmulatorData();
    author = createTestClient();
    const a = await signUpTestUser(author.auth);
    authorUid = a.uid;
    await claimProfile(author.db, authorUid, {
      handle: "poster",
      displayName: "Poster",
    });
  });

  afterEach(async () => {
    await destroyTestClient(author);
  });

  test("a well-formed item is accepted", async () => {
    await addDoc(collection(author.db, "recommendations"), recDoc(VALID_ITEM));
  });

  test("unknown item keys are rejected", async () => {
    await expect(
      addDoc(
        collection(author.db, "recommendations"),
        recDoc({ ...VALID_ITEM, payload: "x".repeat(1000) }),
      ),
    ).rejects.toThrow(DENIED);
  });

  test("non-http image and source URLs are rejected", async () => {
    await expect(
      addDoc(
        collection(author.db, "recommendations"),
        recDoc({ ...VALID_ITEM, imageUrl: "data:image/png;base64,AAAA" }),
      ),
    ).rejects.toThrow(DENIED);
    await expect(
      addDoc(
        collection(author.db, "recommendations"),
        recDoc({ ...VALID_ITEM, sourceUrl: "javascript:alert(1)" }),
      ),
    ).rejects.toThrow(DENIED);
  });

  test("the app-relative placeholder cover is still accepted", async () => {
    await addDoc(
      collection(author.db, "recommendations"),
      recDoc({ ...VALID_ITEM, imageUrl: "/covers/placeholder.svg" }),
    );
  });
});
