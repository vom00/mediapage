import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import { chunk } from "@/lib/chunk";
import type { RecommendationDoc } from "@/lib/recommendations";
import type { UserProfile } from "@/lib/types";

// Firestore "in" queries accept at most 30 values.
const IN_LIMIT = 30;

// The follower's identity, stamped onto the edge so an owner can review
// a pending request without reading the (possibly private) requester's
// profile. Validated against the real profile by security rules.
export interface FollowActor {
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FollowRequest {
  followerUid: string;
  requester: { handle: string; displayName: string; avatarUrl?: string };
  createdAt: Timestamp | null;
}

export function followEdgeId(followerUid: string, followedUid: string): string {
  return `${followerUid}_${followedUid}`;
}

function requesterFields(actor: FollowActor) {
  return {
    handle: actor.handle,
    displayName: actor.displayName,
    // Data-URL avatars stay on the profile doc, never on the edge —
    // keep follow requests tiny. The request list shows initials.
    ...(actor.avatarUrl && !actor.avatarUrl.startsWith("data:")
      ? { avatarUrl: actor.avatarUrl }
      : {}),
  };
}

// Following a public account is instant (approved). Following a private
// account creates a pending request that grants no access until the
// owner approves it — closing the self-service privacy bypass.
export async function follow(
  db: Firestore,
  actor: FollowActor,
  followedUid: string,
  targetIsPublic: boolean,
): Promise<void> {
  if (actor.uid === followedUid) {
    throw new Error("You cannot follow yourself.");
  }
  await setDoc(doc(db, "follows", followEdgeId(actor.uid, followedUid)), {
    followerUid: actor.uid,
    followedUid,
    requester: requesterFields(actor),
    approved: targetIsPublic,
    createdAt: serverTimestamp(),
  });
}

export async function unfollow(
  db: Firestore,
  followerUid: string,
  followedUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "follows", followEdgeId(followerUid, followedUid)));
}

// The owner approves a pending request, flipping it to an active edge.
export async function approveFollowRequest(
  db: Firestore,
  followerUid: string,
  ownerUid: string,
): Promise<void> {
  await updateDoc(doc(db, "follows", followEdgeId(followerUid, ownerUid)), {
    approved: true,
  });
}

// The owner declines a pending request (or removes a follower): the
// edge is deleted either way.
export async function declineFollowRequest(
  db: Firestore,
  followerUid: string,
  ownerUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "follows", followEdgeId(followerUid, ownerUid)));
}

export async function isFollowing(
  db: Firestore,
  followerUid: string,
  followedUid: string,
): Promise<boolean> {
  const snap = await getDoc(
    doc(db, "follows", followEdgeId(followerUid, followedUid)),
  );
  return snap.exists();
}

// Pending requests awaiting this owner's approval, newest first. Built
// from the denormalized requester stamp so it works even when the
// requester's own profile is private.
export async function fetchFollowRequests(
  db: Firestore,
  ownerUid: string,
): Promise<FollowRequest[]> {
  const snap = await getDocs(
    query(
      collection(db, "follows"),
      where("followedUid", "==", ownerUid),
      where("approved", "==", false),
    ),
  );
  const requests = snap.docs.map((d) => {
    const data = d.data() as {
      followerUid: string;
      requester: FollowRequest["requester"];
      createdAt: Timestamp | null;
    };
    return {
      followerUid: data.followerUid,
      requester: data.requester,
      createdAt: data.createdAt ?? null,
    };
  });
  requests.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  return requests;
}

async function hydrateProfiles(
  db: Firestore,
  uids: string[],
): Promise<UserProfile[]> {
  // Followers-only profiles we cannot read just drop out of lists.
  const snaps = await Promise.all(
    uids.map((uid) => getDoc(doc(db, "users", uid)).catch(() => null)),
  );
  return snaps
    .filter((snap) => snap !== null && snap.exists())
    .map((snap) => snap!.data() as UserProfile)
    .filter((profile) => !profile.deleted);
}

export async function fetchFollowers(
  db: Firestore,
  uid: string,
): Promise<UserProfile[]> {
  const snap = await getDocs(
    query(
      collection(db, "follows"),
      where("followedUid", "==", uid),
      where("approved", "==", true),
    ),
  );
  return hydrateProfiles(
    db,
    snap.docs.map((d) => (d.data() as { followerUid: string }).followerUid),
  );
}

export async function fetchFollowing(
  db: Firestore,
  uid: string,
): Promise<UserProfile[]> {
  const snap = await getDocs(
    query(
      collection(db, "follows"),
      where("followerUid", "==", uid),
      where("approved", "==", true),
    ),
  );
  return hydrateProfiles(
    db,
    snap.docs.map((d) => (d.data() as { followedUid: string }).followedUid),
  );
}

export async function fetchFollowedUids(
  db: Firestore,
  uid: string,
): Promise<string[]> {
  const snap = await getDocs(
    query(
      collection(db, "follows"),
      where("followerUid", "==", uid),
      where("approved", "==", true),
    ),
  );
  return snap.docs.map((d) => (d.data() as { followedUid: string }).followedUid);
}

// Recent recommendations from the people someone follows, merged
// newest first across the 30-uid query windows.
export async function fetchFeed(
  db: Firestore,
  followedUids: string[],
  maxItems = 50,
): Promise<RecommendationDoc[]> {
  if (followedUids.length === 0) return [];
  const groups = chunk(followedUids, IN_LIMIT);
  const snaps = await Promise.all(
    groups.map((group) =>
      getDocs(
        query(
          collection(db, "recommendations"),
          where("uid", "in", group),
          orderBy("createdAt", "desc"),
        ),
      ),
    ),
  );
  const all = snaps.flatMap((snap) =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecommendationDoc),
  );
  all.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  return all.slice(0, maxItems);
}
