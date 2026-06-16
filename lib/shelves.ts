import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { MediaCategory, MediaItem } from "@/lib/types";

// Five favorites per shelf, enforced here, in firestore.rules, and
// in the UI.
export const SHELF_MAX = 5;

export class ShelfFullError extends Error {
  constructor() {
    super(
      `This shelf already holds ${SHELF_MAX} favorites. Remove one first to make room.`,
    );
    this.name = "ShelfFullError";
  }
}

export class DuplicatePickError extends Error {
  constructor(title: string) {
    super(`${title} is already on this shelf.`);
    this.name = "DuplicatePickError";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Returns a new array with the pick moved; never drops items.
export function movePick(
  picks: MediaItem[],
  fromIndex: number,
  toIndex: number,
): MediaItem[] {
  const from = clamp(fromIndex, 0, picks.length - 1);
  const to = clamp(toIndex, 0, picks.length - 1);
  if (from === to) return [...picks];
  const next = [...picks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Firestore rejects undefined values; strip absent optional fields.
export function sanitizeMediaItem(item: MediaItem): MediaItem {
  const clean = { ...item };
  for (const key of Object.keys(clean) as (keyof MediaItem)[]) {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  }
  return clean;
}

function shelfRef(db: Firestore, uid: string, category: MediaCategory) {
  return doc(db, "users", uid, "shelves", category);
}

export async function getShelfPicks(
  db: Firestore,
  uid: string,
  category: MediaCategory,
): Promise<MediaItem[]> {
  const snap = await getDoc(shelfRef(db, uid, category));
  if (!snap.exists()) return [];
  return (snap.data() as { picks?: MediaItem[] }).picks ?? [];
}

// Appends atomically; the transaction re-reads the shelf so two
// concurrent adds cannot push it past SHELF_MAX.
export async function addPick(
  db: Firestore,
  uid: string,
  item: MediaItem,
): Promise<void> {
  const ref = shelfRef(db, uid, item.category);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const picks = snap.exists()
      ? ((snap.data() as { picks?: MediaItem[] }).picks ?? [])
      : [];
    if (picks.some((p) => p.id === item.id)) {
      throw new DuplicatePickError(item.title);
    }
    if (picks.length >= SHELF_MAX) {
      throw new ShelfFullError();
    }
    tx.set(ref, {
      uid,
      category: item.category,
      picks: [...picks, sanitizeMediaItem(item)],
    });
  });
}

export async function setShelfPicks(
  db: Firestore,
  uid: string,
  category: MediaCategory,
  picks: MediaItem[],
): Promise<void> {
  if (picks.length > SHELF_MAX) {
    throw new ShelfFullError();
  }
  await setDoc(shelfRef(db, uid, category), {
    uid,
    category,
    picks: picks.map(sanitizeMediaItem),
  });
}

export async function removePick(
  db: Firestore,
  uid: string,
  category: MediaCategory,
  itemId: string,
): Promise<void> {
  const picks = await getShelfPicks(db, uid, category);
  await setShelfPicks(
    db,
    uid,
    category,
    picks.filter((p) => p.id !== itemId),
  );
}
