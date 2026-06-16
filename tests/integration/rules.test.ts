// @vitest-environment node
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
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
});
