import { Timestamp } from "firebase/firestore";
import { describe, expect, test } from "vitest";
import {
  countUnread,
  isUnread,
  type AppNotification,
} from "@/lib/notifications";

function notif(
  kind: AppNotification["kind"],
  atMillis: number | null,
): AppNotification {
  return {
    kind,
    actorUid: "u",
    actor: { handle: "h", displayName: "H" },
    createdAt: atMillis === null ? null : Timestamp.fromMillis(atMillis),
  };
}

describe("notification unread logic", () => {
  test("with no seen marker, everything timestamped counts as unread", () => {
    const list = [notif("follower", 1000), notif("request", 2000)];
    expect(countUnread(list, null)).toBe(2);
  });

  test("only notifications newer than the seen stamp are unread", () => {
    const seenAt = Timestamp.fromMillis(1500);
    const list = [
      notif("follower", 1000), // before — read
      notif("request", 1500), // exactly at — read (strictly newer only)
      notif("follower", 2000), // after — unread
    ];
    expect(isUnread(list[0], seenAt)).toBe(false);
    expect(isUnread(list[1], seenAt)).toBe(false);
    expect(isUnread(list[2], seenAt)).toBe(true);
    expect(countUnread(list, seenAt)).toBe(1);
  });

  test("a pending-timestamp notification (null createdAt) is never counted", () => {
    expect(isUnread(notif("follower", null), null)).toBe(false);
    expect(countUnread([notif("follower", null)], null)).toBe(0);
  });

  test("an empty inbox has nothing unread", () => {
    expect(countUnread([], null)).toBe(0);
    expect(countUnread([], Timestamp.fromMillis(1000))).toBe(0);
  });
});
