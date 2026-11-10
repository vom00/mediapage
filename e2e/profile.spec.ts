import { expect, test, type Page } from "@playwright/test";
import {
  appAlert,
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  signUpAndOnboard,
} from "./support/helpers";

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

// Opens the detail dialog for a fixture anime card and adds it.
async function addAnimePick(page: Page, n: number) {
  await page.getByRole("radio", { name: /shows/i }).check();
  await page
    .getByRole("button", { name: new RegExp(`Mononoke Hour ${n}$`) })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /add to my shows shelf/i }).click();
  await expect(dialog.getByText(/added to your shows shelf/i)).toBeVisible();
  await dialog.getByRole("button", { name: /close/i }).click();
}

test.describe("profile and shelves", () => {
  test("search anime, open detail, add to shelf, see it on the profile", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "collector", "The Collector");

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await page.getByRole("radio", { name: /shows/i }).check();

    // Open the detail view: larger context, synopsis, metadata.
    await page.getByRole("button", { name: /Mononoke Hour 1$/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Mononoke Hour 1" }),
    ).toBeVisible();
    await expect(dialog.getByText(/fixture synopsis for anime/i)).toBeVisible();
    await expect(dialog.getByText("Fixture Animation")).toBeVisible();

    await dialog.getByRole("button", { name: /add to my shows shelf/i }).click();
    await expect(dialog.getByText(/added to your shows shelf/i)).toBeVisible();
    await dialog.getByRole("button", { name: /close/i }).click();

    // The pick appears on the public profile's Anime shelf.
    await page.getByRole("banner").getByRole("link", { name: "@collector" }).click();
    await expect(page).toHaveURL(BASE_URL + "/u/collector");
    await expect(
      page.getByRole("heading", { name: "The Collector" }),
    ).toBeVisible();
    const animeShelf = page.getByRole("region", { name: /shows/i });
    await expect(
      animeShelf.getByRole("heading", { name: "Mononoke Hour 1", exact: true }),
    ).toBeVisible();
  });

  test("a sixth pick is accepted but only five sit out front", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signUpAndOnboard(page, "fiveonly", "Five Only");

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    for (let n = 1; n <= 6; n++) {
      await addAnimePick(page, n);
    }

    // A shelf holds far more than five (SHELF_CAPACITY); the profile
    // features the first five and keeps the rest behind "See all".
    await page.goto(BASE_URL + "/u/fiveonly");
    const animeShelf = page.getByRole("region", { name: /shows/i });
    await expect(animeShelf.getByRole("listitem")).toHaveCount(5);
    await expect(
      animeShelf.getByRole("heading", { name: "Mononoke Hour 6", exact: true }),
    ).toBeHidden();
  });

  test("adding the same pick twice is refused with a clear message", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "nodupes", "No Dupes");

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await addAnimePick(page, 1);

    await page.getByRole("button", { name: /Mononoke Hour 1$/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /add to my shows shelf/i }).click();
    await expect(appAlert(page)).toContainText(/already on this shelf/i);
  });

  test("owner reorders picks with keyboard controls, persists, then removes one", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "sorter", "The Sorter");

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await addAnimePick(page, 1);
    await addAnimePick(page, 2);

    await page.goto(BASE_URL + "/u/sorter");
    const shelf = page.getByRole("region", { name: /shows/i });
    const titles = shelf.getByRole("list").getByRole("heading");
    await expect(titles.nth(0)).toHaveText("Mononoke Hour 1");

    // Keyboard-accessible alternative to drag and drop.
    await shelf
      .getByRole("button", { name: /move mononoke hour 2 earlier/i })
      .click();
    await expect(titles.nth(0)).toHaveText("Mononoke Hour 2");

    // The new order survives a reload.
    await page.reload();
    const shelfAfter = page.getByRole("region", { name: /shows/i });
    await expect(
      shelfAfter.getByRole("list").getByRole("heading").nth(0),
    ).toHaveText("Mononoke Hour 2");

    // Removing a pick.
    await shelfAfter
      .getByRole("button", { name: /remove mononoke hour 1/i })
      .click();
    await expect(
      shelfAfter.getByRole("heading", { name: "Mononoke Hour 1", exact: true }),
    ).toBeHidden();
    await expect(
      shelfAfter.getByRole("heading", { name: "Mononoke Hour 2", exact: true }),
    ).toBeVisible();
  });

  test("visitors see the shelves but no edit controls", async ({ page }) => {
    await signUpAndOnboard(page, "publicfan", "Public Fan");
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("mononoke");
    await addAnimePick(page, 1);
    await page.getByRole("button", { name: /sign out/i }).click();

    await page.goto(BASE_URL + "/u/publicfan");
    await expect(
      page.getByRole("heading", { name: "Public Fan" }),
    ).toBeVisible();
    await expect(page.getByText("@publicfan")).toBeVisible();
    await expect(page.getByText(/0 followers/i)).toBeVisible();

    const shelf = page.getByRole("region", { name: /shows/i });
    await expect(
      shelf.getByRole("heading", { name: "Mononoke Hour 1", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /move/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /remove/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /add to/i })).toHaveCount(0);
  });

  test("unclaimed handles show a clear not-found message", async ({ page }) => {
    await page.goto(BASE_URL + "/u/ghostwriter");
    await expect(page.getByText(/nobody has claimed @ghostwriter/i)).toBeVisible();
  });
});
