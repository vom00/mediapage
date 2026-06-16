import { expect, test } from "@playwright/test";
import {
  AUTH_CLEAR,
  AVATAR_FIXTURE,
  BASE_URL,
  FIRESTORE_CLEAR,
  signUpAndOnboard,
  uniqueEmail,
} from "./support/helpers";

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test.describe("settings", () => {
  test("edit display name and upload a new avatar, see both reflected", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "editor", "Old Name");

    // Settings is reachable from the profile's edit button.
    await page.goto(BASE_URL + "/u/editor");
    await page.getByRole("link", { name: /edit profile/i }).click();
    await expect(page).toHaveURL(BASE_URL + "/settings");

    await page.getByLabel(/display name/i).fill("New Name");
    await page.getByLabel(/profile picture/i).setInputFiles(AVATAR_FIXTURE);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i);

    await page.goto(BASE_URL + "/u/editor");
    await expect(
      page.getByRole("heading", { name: "New Name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("img", { name: /new name/i }),
    ).toBeVisible();
  });

  test("change the handle: new address works, the old one is freed", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "oldname", "Switcher");

    await page.goto(BASE_URL + "/settings");
    await page.getByLabel(/handle/i).fill("newname");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i);

    await expect(
      page.getByRole("banner").getByRole("link", { name: "@newname" }),
    ).toBeVisible();

    await page.goto(BASE_URL + "/u/newname");
    await expect(page.getByRole("heading", { name: "Switcher" })).toBeVisible();

    await page.goto(BASE_URL + "/u/oldname");
    await expect(page.getByText(/nobody has claimed @oldname/i)).toBeVisible();
  });

  test("followers-only profiles hide their shelves from strangers", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "hermit", "The Hermit");
    await page.goto(BASE_URL + "/settings");
    await page.getByLabel(/followers-only/i).check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i);
    await page.getByRole("button", { name: /sign out/i }).click();

    await page.goto(BASE_URL + "/u/hermit");
    await expect(page.getByText(/followers-only/i)).toBeVisible();
    await expect(page.getByRole("region", { name: /shows/i })).toHaveCount(0);
  });

  test("the default comment setting pre-checks the recommend form", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "chatty", "Chatty");
    await page.goto(BASE_URL + "/settings");
    await page.getByLabel(/comments on new recommendations/i).check();
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status")).toContainText(/saved/i);

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await page.getByRole("radio", { name: /shows/i }).check();
    await page.getByRole("button", { name: /Mononoke Hour 1$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^recommend/i }).click();
    await expect(dialog.getByLabel(/allow comments/i)).toBeChecked();
  });

  test("soft delete deactivates with confirmation and can be reversed", async ({
    page,
  }) => {
    const email = uniqueEmail();
    {
      await page.goto(BASE_URL + "/login");
      await page.getByRole("button", { name: /create account/i }).click();
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/^password/i).fill("password-123");
      await page.getByRole("button", { name: /sign up/i }).click();
      await page.getByLabel(/handle/i).fill("phoenix");
      await page.getByLabel(/display name/i).fill("The Phoenix");
      await page.getByRole("button", { name: /finish/i }).click();
      await expect(page).toHaveURL(BASE_URL + "/");
    }

    await page.goto(BASE_URL + "/settings");
    await page.getByRole("button", { name: /deactivate account/i }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm.getByText(/hidden, not deleted/i)).toBeVisible();
    await confirm.getByRole("button", { name: /yes, deactivate/i }).click();

    // Signed out, profile hidden.
    await expect(
      page.getByRole("banner").getByRole("link", { name: /log in/i }),
    ).toBeVisible();
    await page.goto(BASE_URL + "/u/phoenix");
    await expect(page.getByText(/nobody has claimed @phoenix/i)).toBeVisible();

    // Logging back in offers reactivation.
    await page.goto(BASE_URL + "/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill("password-123");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.getByText(/account is deactivated/i)).toBeVisible();
    await page.getByRole("button", { name: /reactivate/i }).click();
    await expect(
      page.getByRole("heading", { name: /your feed/i }),
    ).toBeVisible();

    await page.goto(BASE_URL + "/u/phoenix");
    await expect(
      page.getByRole("heading", { name: "The Phoenix" }),
    ).toBeVisible();
  });
});
