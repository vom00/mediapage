import { expect, test } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  signUpAndOnboard,
} from "./support/helpers";

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test.describe("people search", () => {
  test("find a user by handle, follow them, and open their profile", async ({
    page,
  }) => {
    // A discoverable target exists.
    await signUpAndOnboard(page, "novelist", "The Novelist");
    await page.getByRole("button", { name: /sign out/i }).click();

    // A second user searches for them.
    await signUpAndOnboard(page, "seeker", "The Seeker");
    await page.getByRole("banner").getByRole("link", { name: /people/i }).click();
    await expect(page).toHaveURL(/\/people/);

    await page.getByLabel(/search for people/i).fill("novel");
    const result = page
      .getByRole("listitem")
      .filter({ hasText: "The Novelist" });
    await expect(result).toBeVisible();
    await expect(result.getByText("@novelist")).toBeVisible();

    // Follow from the results (the glass button), then visit the profile.
    await result.getByRole("button", { name: /^follow$/i }).click();
    await expect(result.getByRole("button", { name: /following/i })).toBeVisible();

    await result.getByRole("link", { name: /the novelist/i }).click();
    await expect(page).toHaveURL(BASE_URL + "/u/novelist");
    await expect(
      page.getByRole("heading", { name: "The Novelist" }),
    ).toBeVisible();
  });

  test("the searcher is not listed among their own results", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "narcissus", "Narcissus");
    await page.goto(BASE_URL + "/people");
    await page.getByLabel(/search for people/i).fill("narc");
    await expect(page.getByText(/no one by that handle/i)).toBeVisible();
  });

  test("people search is reachable and usable while signed out", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "findable", "Findable One");
    await page.getByRole("button", { name: /sign out/i }).click();

    await page.goto(BASE_URL + "/people");
    await page.getByLabel(/search for people/i).fill("find");
    await expect(
      page.getByRole("listitem").filter({ hasText: "Findable One" }),
    ).toBeVisible();
  });
});
