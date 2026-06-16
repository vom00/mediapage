import { expect, test } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  postRecommendationViaDialog,
  signUpAndOnboard,
} from "./support/helpers";

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test.describe("following and the home feed", () => {
  test("follow a user, see their recommendations in the feed newest first, browse the lists, then unfollow", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    // A creator posts two recommendations.
    await signUpAndOnboard(page, "creator", "The Creator");
    await postRecommendationViaDialog(page, 1, "First rec: a slow burn.");
    await postRecommendationViaDialog(page, 2, "Second rec: pure energy.");
    await page.getByRole("button", { name: /sign out/i }).click();

    // A fan follows them from the profile header.
    await signUpAndOnboard(page, "fan", "The Fan");
    await page.goto(BASE_URL + "/u/creator");
    await expect(page.getByText(/0 followers/i)).toBeVisible();
    await page.getByRole("button", { name: /^follow$/i }).click();
    await expect(page.getByRole("button", { name: /following/i })).toBeVisible();
    await expect(page.getByText(/1 followers/i)).toBeVisible();

    // The home feed shows the creator's posts, newest first.
    await page.goto(BASE_URL + "/");
    await expect(
      page.getByRole("heading", { name: /your feed/i }),
    ).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Second rec: pure energy.");
    await expect(cards.nth(1)).toContainText("First rec: a slow burn.");

    // The byline links back to the author's page.
    await cards.nth(0).getByRole("link", { name: "@creator" }).click();
    await expect(page).toHaveURL(BASE_URL + "/u/creator");

    // Follower and following lists are viewable.
    await page.goto(BASE_URL + "/u/creator/followers");
    await expect(
      page.getByRole("heading", { name: /followers/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("listitem").getByRole("link", { name: /the fan/i }),
    ).toBeVisible();

    await page.goto(BASE_URL + "/u/fan/following");
    await expect(
      page.getByRole("listitem").getByRole("link", { name: /the creator/i }),
    ).toBeVisible();

    // Unfollow: the feed goes quiet and the count drops.
    await page.goto(BASE_URL + "/u/creator");
    await page.getByRole("button", { name: /following/i }).click();
    await expect(page.getByRole("button", { name: /^follow$/i })).toBeVisible();
    await expect(page.getByText(/0 followers/i)).toBeVisible();

    await page.goto(BASE_URL + "/");
    await expect(page.getByText(/your feed is quiet/i)).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("the landing page still greets signed-out visitors", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await expect(
      page.getByRole("heading", { level: 1, name: /five favorites/i }),
    ).toBeVisible();
  });
});
