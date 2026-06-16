// @vitest-environment node
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  clearEmulatorData,
  createTestClient,
  destroyTestClient,
  signUpTestUser,
  type TestClient,
} from "./helpers";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("storage security rules: avatars", () => {
  let client: TestClient;
  let other: TestClient;

  beforeEach(async () => {
    await clearEmulatorData();
    client = createTestClient();
    other = createTestClient();
  });

  afterEach(async () => {
    await destroyTestClient(client);
    await destroyTestClient(other);
  });

  test("a user can upload an image avatar to their own folder and read it back", async () => {
    const user = await signUpTestUser(client.auth);
    const avatarRef = ref(client.storage, `avatars/${user.uid}/avatar.png`);
    await uploadBytes(avatarRef, PNG_BYTES, { contentType: "image/png" });
    const url = await getDownloadURL(avatarRef);
    expect(url).toContain("avatars");
  });

  test("cannot upload into someone else's avatar folder", async () => {
    const owner = await signUpTestUser(client.auth);
    await signUpTestUser(other.auth);
    const intruderRef = ref(other.storage, `avatars/${owner.uid}/avatar.png`);
    await expect(
      uploadBytes(intruderRef, PNG_BYTES, { contentType: "image/png" }),
    ).rejects.toThrow(/unauthorized|permission/i);
  });

  test("cannot upload non-image content types", async () => {
    const user = await signUpTestUser(client.auth);
    const badRef = ref(client.storage, `avatars/${user.uid}/avatar.png`);
    await expect(
      uploadBytes(badRef, PNG_BYTES, { contentType: "application/pdf" }),
    ).rejects.toThrow(/unauthorized|permission/i);
  });

  test("cannot upload files over the 5MB limit", async () => {
    const user = await signUpTestUser(client.auth);
    const bigRef = ref(client.storage, `avatars/${user.uid}/avatar.png`);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    await expect(
      uploadBytes(bigRef, big, { contentType: "image/png" }),
    ).rejects.toThrow(/unauthorized|permission/i);
  });

  test("cannot write outside the avatars tree", async () => {
    const user = await signUpTestUser(client.auth);
    const strayRef = ref(client.storage, `loose/${user.uid}/file.png`);
    await expect(
      uploadBytes(strayRef, PNG_BYTES, { contentType: "image/png" }),
    ).rejects.toThrow(/unauthorized|permission/i);
  });
});
