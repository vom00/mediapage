// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { searchProfiles } from "@/lib/people";
import { claimProfile } from "@/lib/profile";
import { setAccountDeleted, updateProfileSettings } from "@/lib/settings";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

describe("searchProfiles", () => {
  let anon: TestClient;
  const owners: TestClient[] = [];
  const uids: Record<string, string> = {};

  async function makeProfile(handle: string): Promise<string> {
    const client = createTestClient();
    owners.push(client);
    const user = await signUpTestUser(client.auth);
    await claimProfile(client.db, user.uid, { handle, displayName: handle });
    uids[handle] = user.uid;
    return user.uid;
  }

  beforeEach(async () => {
    await clearEmulatorData();
    owners.length = 0;
    anon = createTestClient();
    await makeProfile("alice");
    await makeProfile("alicia");
    await makeProfile("alistar"); // will go private
    await makeProfile("alibi"); // will be deleted
    await makeProfile("bob");
  });

  afterEach(async () => {
    await destroyTestClient(anon);
    for (const client of owners) await destroyTestClient(client);
  });

  test("returns public profiles whose handle starts with the query, sorted", async () => {
    const results = await searchProfiles(anon.db, "ali");
    expect(results.map((p) => p.handle)).toEqual(["alibi", "alice", "alicia", "alistar"]);
  });

  test("excludes private (followers-only) profiles", async () => {
    const owner = owners[2]; // alistar
    await updateProfileSettings(owner.db, uids.alistar, { isPublic: false });
    const results = await searchProfiles(anon.db, "ali");
    expect(results.map((p) => p.handle)).not.toContain("alistar");
  });

  test("excludes soft-deleted accounts", async () => {
    const owner = owners[3]; // alibi
    await setAccountDeleted(owner.db, uids.alibi, true);
    const results = await searchProfiles(anon.db, "ali");
    expect(results.map((p) => p.handle)).not.toContain("alibi");
  });

  test("does not match non-prefix handles", async () => {
    const results = await searchProfiles(anon.db, "ali");
    expect(results.map((p) => p.handle)).not.toContain("bob");
  });

  test("excludes the searcher when excludeUid is given", async () => {
    const results = await searchProfiles(anon.db, "ali", {
      excludeUid: uids.alice,
    });
    expect(results.map((p) => p.handle)).not.toContain("alice");
    expect(results.map((p) => p.handle)).toContain("alicia");
  });

  test("an empty query returns nothing without hitting the network", async () => {
    expect(await searchProfiles(anon.db, "   ")).toEqual([]);
  });
});
