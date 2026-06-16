// @vitest-environment node
import { doc, getDoc } from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimProfile, HandleTakenError, isHandleTaken } from "@/lib/profile";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

describe("claimProfile", () => {
  let clientA: TestClient;
  let clientB: TestClient;

  beforeEach(async () => {
    await clearEmulatorData();
    clientA = createTestClient();
    clientB = createTestClient();
  });

  afterEach(async () => {
    await destroyTestClient(clientA);
    await destroyTestClient(clientB);
  });

  test("creates the user profile and the handle lookup atomically", async () => {
    const user = await signUpTestUser(clientA.auth);

    await claimProfile(clientA.db, user.uid, {
      handle: "FilmFan",
      displayName: "Film Fan",
    });

    const profileSnap = await getDoc(doc(clientA.db, "users", user.uid));
    expect(profileSnap.exists()).toBe(true);
    expect(profileSnap.data()).toMatchObject({
      uid: user.uid,
      handle: "filmfan", // stored normalized
      displayName: "Film Fan",
      isPublic: true,
      defaultCommentsOn: false, // comments are opt-in by default
    });

    const handleSnap = await getDoc(doc(clientA.db, "handles", "filmfan"));
    expect(handleSnap.exists()).toBe(true);
    expect(handleSnap.data()).toEqual({ uid: user.uid });
  });

  test("rejects an invalid handle without writing anything", async () => {
    const user = await signUpTestUser(clientA.auth);

    await expect(
      claimProfile(clientA.db, user.uid, { handle: "ab", displayName: "X" }),
    ).rejects.toThrow(/at least 3/i);

    const profileSnap = await getDoc(doc(clientA.db, "users", user.uid));
    expect(profileSnap.exists()).toBe(false);
  });

  test("a second user cannot claim a taken handle", async () => {
    const userA = await signUpTestUser(clientA.auth);
    await claimProfile(clientA.db, userA.uid, {
      handle: "filmfan",
      displayName: "First",
    });

    const userB = await signUpTestUser(clientB.auth);
    await expect(
      claimProfile(clientB.db, userB.uid, {
        handle: "filmfan",
        displayName: "Second",
      }),
    ).rejects.toThrow(HandleTakenError);

    // The original owner keeps the handle.
    const handleSnap = await getDoc(doc(clientA.db, "handles", "filmfan"));
    expect(handleSnap.data()).toEqual({ uid: userA.uid });
  });

  test("isHandleTaken reflects availability", async () => {
    const user = await signUpTestUser(clientA.auth);
    expect(await isHandleTaken(clientA.db, "filmfan")).toBe(false);
    await claimProfile(clientA.db, user.uid, {
      handle: "filmfan",
      displayName: "Film Fan",
    });
    expect(await isHandleTaken(clientA.db, "filmfan")).toBe(true);
  });
});
