import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { MediaCategory, MediaItem } from "@/lib/types";

// A shelf is keyed by one of the five media categories or by the
// catch-all "watchlist", which collects mixed media a user means to get
// to. Same storage shape, same rules, same per-shelf cap.
export type ShelfKey = MediaCategory | "watchlist";

export const WATCHLIST: ShelfKey = "watchlist";

// How many picks a shelf shows on the profile before "See all" reveals
// the rest. Users can add far more; only the featured few sit out front.
export const SHELF_PREVIEW_COUNT = 5;

// Hard ceiling per shelf, enforced here, in firestore.rules, and in the
// UI. Generous enough to feel unlimited while keeping the shelf document
// cheap to read and comfortably under Firestore's 1 MB limit.
export const SHELF_CAPACITY = 100;

export class ShelfFullError extends Error {
  constructor() {
    super(
      `This shelf is full at ${SHELF_CAPACITY} items. Remove one to make room.`,
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

function shelfRef(db: Firestore, uid: string, shelf: ShelfKey) {
  return doc(db, "users", uid, "shelves", shelf);
}

export async function getShelfPicks(
  db: Firestore,
  uid: string,
  shelf: ShelfKey,
): Promise<MediaItem[]> {
  const snap = await getDoc(shelfRef(db, uid, shelf));
  if (!snap.exists()) return [];
  return (snap.data() as { picks?: MediaItem[] }).picks ?? [];
}

// Appends atomically; the transaction re-reads the shelf so two
// concurrent adds cannot push it past SHELF_CAPACITY. Defaults to the
// item's own category shelf, or pass an explicit shelf (e.g. WATCHLIST)
// to file the same item somewhere else.
export async function addPick(
  db: Firestore,
  uid: string,
  item: MediaItem,
  shelf: ShelfKey = item.category,
): Promise<void> {
  const ref = shelfRef(db, uid, shelf);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const picks = snap.exists()
      ? ((snap.data() as { picks?: MediaItem[] }).picks ?? [])
      : [];
    if (picks.some((p) => p.id === item.id)) {
      throw new DuplicatePickError(item.title);
    }
    if (picks.length >= SHELF_CAPACITY) {
      throw new ShelfFullError();
    }
    tx.set(ref, {
      uid,
      category: shelf,
      picks: [...picks, sanitizeMediaItem(item)],
    });
  });
}

export async function setShelfPicks(
  db: Firestore,
  uid: string,
  shelf: ShelfKey,
  picks: MediaItem[],
): Promise<void> {
  if (picks.length > SHELF_CAPACITY) {
    throw new ShelfFullError();
  }
  await setDoc(shelfRef(db, uid, shelf), {
    uid,
    category: shelf,
    picks: picks.map(sanitizeMediaItem),
  });
}

export async function removePick(
  db: Firestore,
  uid: string,
  shelf: ShelfKey,
  itemId: string,
): Promise<void> {
  const picks = await getShelfPicks(db, uid, shelf);
  await setShelfPicks(
    db,
    uid,
    shelf,
    picks.filter((p) => p.id !== itemId),
  );
}
