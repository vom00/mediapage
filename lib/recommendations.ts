import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { chunk } from "@/lib/chunk";
import { sanitizeMediaItem } from "@/lib/shelves";
import type { MediaItem } from "@/lib/types";

export const NOTE_MAX = 500;
export const COMMENT_MAX = 500;

// How many of a profile's recommendations any view loads. Nobody
// scrolls past this, and it keeps a prolific profile from becoming an
// unbounded read.
export const PROFILE_REC_LIMIT = 100;

// Firestore batches allow 500 writes; stay comfortably under.
const DELETE_BATCH = 400;

// Denormalized author identity stamped onto posts and comments so
// feeds render without N extra profile reads.
export interface RecommendationAuthor {
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
}

export interface RecommendationDoc {
  id: string;
  uid: string;
  author: { handle: string; displayName: string; avatarUrl?: string };
  item: MediaItem;
  note: string;
  commentsEnabled: boolean;
  createdAt: Timestamp | null;
}

export interface CommentDoc {
  id: string;
  uid: string;
  recommendationId: string;
  author: { handle: string; displayName: string; avatarUrl?: string };
  body: string;
  createdAt: Timestamp | null;
}

function authorFields(author: RecommendationAuthor) {
  return {
    handle: author.handle,
    displayName: author.displayName,
    // Avatars are stored as data URLs on the profile; never copy one
    // into a stamp, or every recommendation would carry tens of KB.
    // Bylines fall back to initials, and the @handle links to the
    // profile where the picture lives.
    ...(author.avatarUrl && !author.avatarUrl.startsWith("data:")
      ? { avatarUrl: author.avatarUrl }
      : {}),
  };
}

export async function postRecommendation(
  db: Firestore,
  author: RecommendationAuthor,
  item: MediaItem,
  note: string,
  commentsEnabled: boolean,
): Promise<string> {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error("Say at least a few words about why.");
  }
  if (trimmed.length > NOTE_MAX) {
    throw new Error(`Notes can have at most ${NOTE_MAX} characters.`);
  }
  const ref = await addDoc(collection(db, "recommendations"), {
    uid: author.uid,
    author: authorFields(author),
    item: sanitizeMediaItem(item),
    note: trimmed,
    commentsEnabled,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setRecommendationComments(
  db: Firestore,
  recommendationId: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(doc(db, "recommendations", recommendationId), {
    commentsEnabled: enabled,
  });
}

// Deletes the recommendation *and* its comments: Firestore never
// cascades subcollection deletes, so without this the comments would
// linger world-readable under the dead document forever. Comments go
// first — the moderation rule that lets the author delete them checks
// the parent doc, which must still exist at that point.
export async function deleteRecommendation(
  db: Firestore,
  recommendationId: string,
): Promise<void> {
  const comments = await getDocs(
    collection(db, "recommendations", recommendationId, "comments"),
  );
  for (const group of chunk(comments.docs, DELETE_BATCH)) {
    const batch = writeBatch(db);
    for (const comment of group) {
      batch.delete(comment.ref);
    }
    await batch.commit();
  }
  await deleteDoc(doc(db, "recommendations", recommendationId));
}

export async function fetchRecommendationsByUser(
  db: Firestore,
  uid: string,
): Promise<RecommendationDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, "recommendations"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(PROFILE_REC_LIMIT),
    ),
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as RecommendationDoc,
  );
}

export async function addComment(
  db: Firestore,
  author: RecommendationAuthor,
  recommendationId: string,
  body: string,
): Promise<string> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Comments need at least one character.");
  }
  if (trimmed.length > COMMENT_MAX) {
    throw new Error(`Comments can have at most ${COMMENT_MAX} characters.`);
  }
  const ref = await addDoc(
    collection(db, "recommendations", recommendationId, "comments"),
    {
      uid: author.uid,
      recommendationId,
      author: authorFields(author),
      body: trimmed,
      createdAt: serverTimestamp(),
    },
  );
  return ref.id;
}

export async function deleteComment(
  db: Firestore,
  recommendationId: string,
  commentId: string,
): Promise<void> {
  await deleteDoc(
    doc(db, "recommendations", recommendationId, "comments", commentId),
  );
}

export async function fetchComments(
  db: Firestore,
  recommendationId: string,
): Promise<CommentDoc[]> {
  const snap = await getDocs(
    query(
      collection(db, "recommendations", recommendationId, "comments"),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommentDoc);
}
