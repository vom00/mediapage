import {
  collection,
  endAt,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  where,
  type Firestore,
} from "firebase/firestore";
import type { UserProfile } from "@/lib/types";

// U+F8FF is a very high Unicode code point; appending it to the term
// bounds a "starts-with" range query on the lowercased handle.
const HANDLE_PREFIX_END = String.fromCharCode(0xf8ff);

// Normalizes a raw people-search box value into a handle prefix:
// lowercase, no leading @, no surrounding space. Unlike
// validateHandle this accepts partial prefixes for live search.
export function profileSearchTerm(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export interface ProfileSearchOptions {
  max?: number;
  excludeUid?: string;
}

// Finds public profiles whose handle starts with the query. Private
// (followers-only) profiles are not returned — they are not publicly
// readable, so they stay out of discovery — and soft-deleted
// accounts and the searcher themselves are filtered out.
export async function searchProfiles(
  db: Firestore,
  rawQuery: string,
  options: ProfileSearchOptions = {},
): Promise<UserProfile[]> {
  const term = profileSearchTerm(rawQuery);
  if (!term) return [];
  const max = options.max ?? 20;

  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("isPublic", "==", true),
      orderBy("handle"),
      startAt(term),
      endAt(`${term}${HANDLE_PREFIX_END}`),
      limit(max),
    ),
  );

  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter((p) => !p.deleted && p.uid !== options.excludeUid);
}
