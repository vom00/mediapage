import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";

// Notifications are *derived* from the follow edges other users wrote,
// not stored as separate documents: an approved incoming edge is a new
// follower, a pending one is a follow request. This keeps a single
// source of truth (no edge/notification drift) and adds no write surface
// a stranger could abuse to spam someone's inbox.
export type NotificationKind = "follower" | "request";

export interface AppNotification {
  kind: NotificationKind;
  actorUid: string;
  // The follower's denormalized stamp (validated against their real
  // profile by the follows rules), so it renders even when the actor's
  // own profile is followers-only.
  actor: { handle: string; displayName: string; avatarUrl?: string };
  createdAt: Timestamp | null;
}

interface IncomingEdge {
  followerUid: string;
  approved: boolean;
  requester: { handle: string; displayName: string; avatarUrl?: string };
  createdAt: Timestamp | null;
}

function toNotification(data: IncomingEdge): AppNotification {
  return {
    kind: data.approved ? "follower" : "request",
    actorUid: data.followerUid,
    actor: data.requester,
    createdAt: data.createdAt ?? null,
  };
}

function newestFirst(list: AppNotification[]): AppNotification[] {
  return [...list].sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
}

function incomingFollowsQuery(db: Firestore, ownerUid: string) {
  return query(collection(db, "follows"), where("followedUid", "==", ownerUid));
}

// Every incoming edge as a notification (followers + pending requests),
// newest first. A single-field query — no composite index needed.
export async function fetchNotifications(
  db: Firestore,
  ownerUid: string,
): Promise<AppNotification[]> {
  const snap = await getDocs(incomingFollowsQuery(db, ownerUid));
  return newestFirst(snap.docs.map((d) => toNotification(d.data() as IncomingEdge)));
}

// Live subscription used by the nav bell and the notifications page.
export function watchNotifications(
  db: Firestore,
  ownerUid: string,
  cb: (notifications: AppNotification[]) => void,
): Unsubscribe {
  return onSnapshot(incomingFollowsQuery(db, ownerUid), (snap) =>
    cb(newestFirst(snap.docs.map((d) => toNotification(d.data() as IncomingEdge)))),
  );
}

// Private per-user read state. Lives under the owner's own document
// (rules: owner-only) so the last time you checked never leaks.
const SEEN_DOC = "notifications";

function seenRef(db: Firestore, ownerUid: string) {
  return doc(db, "users", ownerUid, "meta", SEEN_DOC);
}

function readSeenAt(data: { seenAt?: Timestamp } | undefined): Timestamp | null {
  return data?.seenAt ?? null;
}

export async function fetchNotificationsSeenAt(
  db: Firestore,
  ownerUid: string,
): Promise<Timestamp | null> {
  const snap = await getDoc(seenRef(db, ownerUid));
  return snap.exists() ? readSeenAt(snap.data()) : null;
}

export function watchNotificationsSeenAt(
  db: Firestore,
  ownerUid: string,
  cb: (seenAt: Timestamp | null) => void,
): Unsubscribe {
  return onSnapshot(seenRef(db, ownerUid), (snap) =>
    cb(snap.exists() ? readSeenAt(snap.data()) : null),
  );
}

// Stamp "I've looked now". Clears the unread badge; anything that
// arrives afterward reads as new again.
export async function markNotificationsSeen(
  db: Firestore,
  ownerUid: string,
): Promise<void> {
  await setDoc(seenRef(db, ownerUid), { seenAt: serverTimestamp() });
}

// Pure: is this notification newer than the last time the owner looked?
export function isUnread(
  notification: AppNotification,
  seenAt: Timestamp | null,
): boolean {
  return (notification.createdAt?.toMillis() ?? 0) > (seenAt?.toMillis() ?? 0);
}

// Pure: how many notifications are newer than the last seen stamp.
export function countUnread(
  notifications: AppNotification[],
  seenAt: Timestamp | null,
): number {
  return notifications.filter((n) => isUnread(n, seenAt)).length;
}
