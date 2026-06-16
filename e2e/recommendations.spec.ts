import { expect, test, type Page } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  signUpAndOnboard,
  uniqueEmail,
} from "./support/helpers";

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

async function postRecommendation(
  page: Page,
  options: { allowComments: boolean },
) {
  await page.goto(BASE_URL + "/library");
  await page.getByLabel(/search the library/i).fill("mononoke");
  await page.getByRole("radio", { name: /shows/i }).check();
  await page.getByRole("button", { name: /Mononoke Hour 1$/ }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^recommend/i }).click();
  await dialog
    .getByLabel(/why this one/i)
    .fill("A quiet masterpiece. Watch it twice.");
  if (options.allowComments) {
    await dialog.getByLabel(/allow comments/i).check();
  }
  await dialog.getByRole("button", { name: /post recommendation/i }).click();
  await expect(dialog.getByText(/recommendation posted/i)).toBeVisible();
  await dialog.getByRole("button", { name: /close/i }).click();
}

// The posted comment as it appears in the thread (not the textarea).
function commentInList(page: Page) {
  return page.getByRole("listitem").getByText("Great pick, honestly.");
}

async function logIn(page: Page, email: string) {
  await page.goto(BASE_URL + "/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill("password-123");
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(BASE_URL + "/");
}

test.describe("recommendations", () => {
  test("a recommendation with comments off renders no comment box", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "offposter", "Off Poster");
    await postRecommendation(page, { allowComments: false });

    await page.goto(BASE_URL + "/u/offposter");
    const section = page.getByRole("region", { name: /recommendations/i });
    await expect(section.getByText(/a quiet masterpiece/i)).toBeVisible();
    await expect(
      section.getByRole("heading", { name: "Mononoke Hour 1", exact: true }),
    ).toBeVisible();

    // Genuinely optional: no comment composer, on or off the account.
    await expect(section.getByText(/comments are off/i)).toBeVisible();
    await expect(page.getByLabel(/add a comment/i)).toHaveCount(0);

    await page.getByRole("button", { name: /sign out/i }).click();
    await page.goto(BASE_URL + "/u/offposter");
    await expect(page.getByLabel(/add a comment/i)).toHaveCount(0);
    await expect(page.getByText(/log in to comment/i)).toHaveCount(0);
  });

  test("comments on: another user comments, the author hides then re-shows the thread, and moderates", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const authorEmail = uniqueEmail();
    {
      // Author posts with comments enabled.
      await page.goto(BASE_URL + "/login");
      await page.getByRole("button", { name: /create account/i }).click();
      await page.getByLabel(/email/i).fill(authorEmail);
      await page.getByLabel(/^password/i).fill("password-123");
      await page.getByRole("button", { name: /sign up/i }).click();
      await page.getByLabel(/handle/i).fill("onposter");
      await page.getByLabel(/display name/i).fill("On Poster");
      await page.getByRole("button", { name: /finish/i }).click();
      await expect(page).toHaveURL(BASE_URL + "/");
    }
    await postRecommendation(page, { allowComments: true });
    await page.getByRole("button", { name: /sign out/i }).click();

    // A second user comments.
    await signUpAndOnboard(page, "commenter", "The Commenter");
    await page.goto(BASE_URL + "/u/onposter");
    await page.getByLabel(/add a comment/i).fill("Great pick, honestly.");
    await page.getByRole("button", { name: /post comment/i }).click();
    await expect(commentInList(page)).toBeVisible();
    await expect(
      page.getByRole("listitem").getByText("@commenter"),
    ).toBeVisible();
    await page.getByRole("button", { name: /sign out/i }).click();

    // The author flips the toggle off: thread hides but survives.
    await logIn(page, authorEmail);
    await page.goto(BASE_URL + "/u/onposter");
    await expect(commentInList(page)).toBeVisible();
    await page.getByRole("button", { name: /turn comments off/i }).click();
    await expect(commentInList(page)).toBeHidden();
    await expect(page.getByLabel(/add a comment/i)).toHaveCount(0);
    await expect(page.getByText(/comments are off/i)).toBeVisible();

    // Hidden, not destroyed.
    await page.getByRole("button", { name: /turn comments on/i }).click();
    await expect(commentInList(page)).toBeVisible();

    // Moderation: the author deletes the comment.
    await page
      .getByRole("button", { name: /delete comment by @commenter/i })
      .click();
    await expect(commentInList(page)).toBeHidden();
  });
});
