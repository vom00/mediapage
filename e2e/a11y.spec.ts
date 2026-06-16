import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  postRecommendationViaDialog,
  signUpAndOnboard,
} from "./support/helpers";

// Axe audit across the app's surfaces. Serious and critical
// violations fail the build; the monochrome palette especially has
// to prove its contrast.

async function audit(page: Page, context: string) {
  // Jump the reveal choreography to its end state; axe must sample
  // resting colors, not mid-fade blends. (Infinite loops like
  // skeleton pulses cannot be finished, only cancelled.)
  await page.evaluate(() =>
    document.getAnimations().forEach((animation) => {
      const end = Number(animation.effect?.getComputedTiming().endTime);
      if (Number.isFinite(end)) animation.finish();
      else animation.cancel();
    }),
  );
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    blocking.map((v) => `${context}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} nodes)`),
  ).toEqual([]);
}

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test.describe("accessibility audit", () => {
  test("landing and login pages pass axe", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await audit(page, "landing");

    await page.goto(BASE_URL + "/login");
    await audit(page, "login");
  });

  test("library with results and an open detail dialog pass axe", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("paper moon");
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await audit(page, "library");

    await page.getByRole("button", { name: /Paper Moon 1$/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await audit(page, "detail dialog");
  });

  test("a lived-in profile and settings pass axe", async ({ page }) => {
    test.setTimeout(120_000);
    await signUpAndOnboard(page, "audited", "Audited User");
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await page.getByRole("radio", { name: /shows/i }).check();
    await page.getByRole("button", { name: /Mononoke Hour 1$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /add to my shows shelf/i }).click();
    await dialog.getByText(/added to your shows shelf/i).waitFor();
    await dialog.getByRole("button", { name: /close/i }).click();
    await postRecommendationViaDialog(page, 2, "Audit this note.", {
      allowComments: true,
    });

    await page.goto(BASE_URL + "/u/audited");
    await expect(
      page.getByRole("heading", { name: "Audited User" }),
    ).toBeVisible();
    await audit(page, "profile");

    await page.goto(BASE_URL + "/settings");
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await audit(page, "settings");
  });

  test("keyboard: the first tab stop is the skip link and it works", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to content/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});
