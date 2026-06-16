import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { normalizeHandle, validateHandle } from "@/lib/handles";
import { HandleTakenError, isHandleTaken } from "@/lib/profile";

export interface ProfileSettingsUpdate {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  isPublic?: boolean;
  defaultCommentsOn?: boolean;
}

export async function updateProfileSettings(
  db: Firestore,
  uid: string,
  update: ProfileSettingsUpdate,
): Promise<void> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    if (value !== undefined) fields[key] = value;
  }
  if (Object.keys(fields).length === 0) return;
  await updateDoc(doc(db, "users", uid), fields);
}

// Swaps handles atomically: releases the old lookup doc, claims the
// new one, and updates the profile, all in one batch the rules
// cross-check with getAfter/existsAfter.
export async function changeHandle(
  db: Firestore,
  uid: string,
  currentHandle: string,
  nextHandleRaw: string,
): Promise<void> {
  const next = normalizeHandle(nextHandleRaw);
  const current = normalizeHandle(currentHandle);
  if (next === current) return;

  const validation = validateHandle(next);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  const currentSnap = await getDoc(doc(db, "handles", current));
  if (!currentSnap.exists() || currentSnap.data()?.uid !== uid) {
    throw new Error("You can only change your own handle.");
  }
  if (await isHandleTaken(db, next)) {
    throw new HandleTakenError(next);
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, "handles", current));
  batch.set(doc(db, "handles", next), { uid });
  batch.update(doc(db, "users", uid), { handle: next });
  try {
    await batch.commit();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "permission-denied"
    ) {
      // Lost the uniqueness race on the new handle.
      throw new HandleTakenError(next);
    }
    throw error;
  }
}

// Soft delete: the account and its data stay in Firestore, the
// profile just stops being served. Reactivation flips it back.
export async function setAccountDeleted(
  db: Firestore,
  uid: string,
  deleted: boolean,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { deleted });
}
