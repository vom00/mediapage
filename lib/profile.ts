import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { normalizeHandle, validateHandle } from "@/lib/handles";

export class HandleTakenError extends Error {
  constructor(handle: string) {
    super(`The handle @${handle} is already taken.`);
    this.name = "HandleTakenError";
  }
}

export async function isHandleTaken(
  db: Firestore,
  handle: string,
): Promise<boolean> {
  const snap = await getDoc(doc(db, "handles", normalizeHandle(handle)));
  return snap.exists();
}

// Maps a public handle to its owner's uid, or null when unclaimed.
export async function resolveHandle(
  db: Firestore,
  handle: string,
): Promise<string | null> {
  const snap = await getDoc(doc(db, "handles", normalizeHandle(handle)));
  if (!snap.exists()) return null;
  return (snap.data() as { uid: string }).uid;
}

export interface ClaimProfileInput {
  handle: string;
  displayName: string;
  avatarUrl?: string;
}

// Creates users/{uid} and handles/{handle} in one atomic batch.
// Uniqueness is guaranteed by security rules: the handles doc is
// create-only, so a concurrent claim of the same handle loses the
// race and the whole batch fails.
export async function claimProfile(
  db: Firestore,
  uid: string,
  input: ClaimProfileInput,
): Promise<void> {
  const handle = normalizeHandle(input.handle);
  const validation = validateHandle(handle);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  // Fast feedback before attempting the batch; the rules still
  // protect against the race where someone claims it in between.
  if (await isHandleTaken(db, handle)) {
    throw new HandleTakenError(handle);
  }

  const batch = writeBatch(db);
  batch.set(doc(db, "handles", handle), { uid });
  batch.set(doc(db, "users", uid), {
    uid,
    handle,
    displayName: input.displayName,
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    isPublic: true,
    defaultCommentsOn: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "permission-denied"
    ) {
      // The only way a well-formed claim is denied is losing the
      // uniqueness race on the handle doc.
      throw new HandleTakenError(handle);
    }
    throw error;
  }
}
