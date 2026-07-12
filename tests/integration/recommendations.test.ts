// @vitest-environment node
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimProfile } from "@/lib/profile";
import {
  addComment,
  deleteComment,
  deleteRecommendation,
  fetchComments,
  fetchRecommendationsByUser,
  postRecommendation,
  setRecommendationComments,
  type RecommendationAuthor,
} from "@/lib/recommendations";
import type { MediaItem } from "@/lib/types";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

const DENIED = /insufficient permissions|PERMISSION_DENIED/i;

const ITEM: MediaItem = {
  id: "anilist:1",
  source: "anilist",
  sourceId: "1",
  category: "shows",
  title: "Mononoke",
  imageUrl: "/covers/placeholder.svg",
  year: 2007,
};

describe("recommendations and comments", () => {
  let alice: TestClient;
  let bob: TestClient;
  let cara: TestClient;
  let aliceUid: string;
  let bobUid: string;
  let aliceAuthor: RecommendationAuthor;
  let bobAuthor: RecommendationAuthor;

  beforeEach(async () => {
    await clearEmulatorData();
    alice = createTestClient();
    bob = createTestClient();
    cara = createTestClient();
    const a = await signUpTestUser(alice.auth);
    aliceUid = a.uid;
    await claimProfile(alice.db, aliceUid, {
      handle: "alice",
      displayName: "Alice",
    });
    const b = await signUpTestUser(bob.auth);
    bobUid = b.uid;
    await claimProfile(bob.db, bobUid, { handle: "bob", displayName: "Bob" });
    aliceAuthor = { uid: aliceUid, handle: "alice", displayName: "Alice" };
    bobAuthor = { uid: bobUid, handle: "bob", displayName: "Bob" };
  });

  afterEach(async () => {
    await destroyTestClient(alice);
    await destroyTestClient(bob);
    await destroyTestClient(cara);
  });

  test("posting stores the item, note, author, and toggle; list is newest first", async () => {
    await postRecommendation(alice.db, aliceAuthor, ITEM, "First note", false);
    const secondId = await postRecommendation(
      alice.db,
      aliceAuthor,
      { ...ITEM, id: "anilist:2", sourceId: "2", title: "Second" },
      "Second note",
      true,
    );

    const recs = await fetchRecommendationsByUser(alice.db, aliceUid);
    expect(recs).toHaveLength(2);
    expect(recs[0].id).toBe(secondId); // newest first
    expect(recs[0]).toMatchObject({
      uid: aliceUid,
      note: "Second note",
      commentsEnabled: true,
      author: { handle: "alice", displayName: "Alice" },
    });
    expect(recs[0].item.title).toBe("Second");
  });

  test("cannot post a recommendation under someone else's uid", async () => {
    await expect(
      addDoc(collection(bob.db, "recommendations"), {
        uid: aliceUid,
        author: { handle: "alice", displayName: "Alice" },
        item: ITEM,
        note: "Forged",
        commentsEnabled: false,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules reject a recommendation whose author stamp impersonates someone else", async () => {
    // uid is alice's own, but the displayed author is forged as Bob.
    await expect(
      addDoc(collection(alice.db, "recommendations"), {
        uid: aliceUid,
        author: { handle: "bob", displayName: "Bob" },
        item: ITEM,
        note: "Impersonating",
        commentsEnabled: false,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules reject a comment whose author stamp impersonates someone else", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    await expect(
      addDoc(collection(bob.db, "recommendations", recId, "comments"), {
        uid: bobUid,
        recommendationId: recId,
        author: { handle: "alice", displayName: "Alice" },
        body: "Impersonating",
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("rules reject notes over 500 characters", async () => {
    await expect(
      addDoc(collection(alice.db, "recommendations"), {
        uid: aliceUid,
        author: { handle: "alice", displayName: "Alice" },
        item: ITEM,
        note: "x".repeat(501),
        commentsEnabled: false,
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("the author can flip the comments toggle, and only that", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      false,
    );
    await setRecommendationComments(alice.db, recId, true);
    const snap = await getDoc(doc(alice.db, "recommendations", recId));
    expect(snap.data()?.commentsEnabled).toBe(true);

    // Editing the note through update is not allowed even for the author.
    await expect(
      updateDoc(doc(alice.db, "recommendations", recId), { note: "Edited" }),
    ).rejects.toThrow(DENIED);

    // Someone else cannot flip the toggle.
    await expect(
      updateDoc(doc(bob.db, "recommendations", recId), {
        commentsEnabled: false,
      }),
    ).rejects.toThrow(DENIED);
  });

  test("comments work only while enabled, and are newest first", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    await addComment(bob.db, bobAuthor, recId, "First!");
    await addComment(bob.db, bobAuthor, recId, "Second thought.");

    const comments = await fetchComments(bob.db, recId);
    expect(comments.map((c) => c.body)).toEqual(["Second thought.", "First!"]);
    expect(comments[0].author.handle).toBe("bob");

    await setRecommendationComments(alice.db, recId, false);
    await expect(
      addComment(bob.db, bobAuthor, recId, "Too late"),
    ).rejects.toThrow(DENIED);

    // Hidden, not destroyed: the earlier comments still exist.
    const after = await fetchComments(bob.db, recId);
    expect(after).toHaveLength(2);
  });

  test("comments cannot be forged under another uid", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    await expect(
      addDoc(collection(bob.db, "recommendations", recId, "comments"), {
        uid: aliceUid,
        recommendationId: recId,
        author: { handle: "alice", displayName: "Alice" },
        body: "Forged",
        createdAt: serverTimestamp(),
      }),
    ).rejects.toThrow(DENIED);
  });

  test("the recommendation author moderates: deletes any comment", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    const commentId = await addComment(bob.db, bobAuthor, recId, "Spam");
    await deleteComment(alice.db, recId, commentId);
    expect(await fetchComments(alice.db, recId)).toHaveLength(0);
  });

  test("commenters can delete their own, strangers cannot", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    const commentId = await addComment(bob.db, bobAuthor, recId, "Mine");

    await signUpTestUser(cara.auth);
    await expect(deleteComment(cara.db, recId, commentId)).rejects.toThrow(
      DENIED,
    );

    await deleteComment(bob.db, recId, commentId);
    expect(await fetchComments(bob.db, recId)).toHaveLength(0);
  });

  test("the author can delete the whole recommendation", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      false,
    );
    await deleteRecommendation(alice.db, recId);
    expect(await fetchRecommendationsByUser(alice.db, aliceUid)).toHaveLength(0);

    const recIdB = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      false,
    );
    await expect(
      deleteRecommendation(bob.db, recIdB),
    ).rejects.toThrow(DENIED);
  });

  test("deleting a recommendation takes its comments with it", async () => {
    const recId = await postRecommendation(
      alice.db,
      aliceAuthor,
      ITEM,
      "Note",
      true,
    );
    await addComment(bob.db, bobAuthor, recId, "First!");
    await addComment(alice.db, aliceAuthor, recId, "Thanks");
    expect(await fetchComments(alice.db, recId)).toHaveLength(2);

    await deleteRecommendation(alice.db, recId);

    // The comments are gone, not orphaned under the dead parent.
    expect(await fetchComments(alice.db, recId)).toHaveLength(0);
  });
});
