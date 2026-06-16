import { expect, test } from "@playwright/test";

// Parameterized base URL; override per run with PW_BASE_URL.
const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

test.describe("library search", () => {
  test("searching shows result cards with cover art and metadata", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("paper moon");

    const cards = page.getByRole("listitem");
    await expect(cards).toHaveCount(20);
    await expect(cards.first()).toContainText("Paper Moon 1");

    // Every cover has descriptive alt text including the title.
    const firstCover = cards.first().getByRole("img");
    await expect(firstCover).toHaveAttribute("alt", /paper moon 1/i);

    // Result count is shown (and mirrored to a live region).
    await expect(page.getByText("20 results", { exact: true })).toBeVisible();
  });

  test("skeleton placeholders reserve space while loading", async ({ page }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("slow");
    // The fixture source delays responses, so skeletons must appear.
    await expect(
      page.getByTestId("result-skeleton").first(),
    ).toBeVisible({ timeout: 2000 });
    // And give way to results.
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("infinite scroll loads the next page and reports the end", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("paper moon");
    await expect(page.getByRole("listitem")).toHaveCount(20);

    // Scrolling the sentinel into view auto-loads the next page.
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight),
    );
    await expect(page.getByRole("listitem")).toHaveCount(40);
    await expect(
      page.getByRole("heading", { name: "Paper Moon 21" }),
    ).toBeVisible();

    // Fixture catalog has exactly two pages, so the end is reported
    // and the manual "load more" fallback is gone.
    await expect(page.getByText(/end of the results/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /load more/i }),
    ).toBeHidden();
  });

  test("category filter switches sources", async ({ page }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("static");
    await expect(page.getByRole("listitem").first()).toContainText(
      "Paper Moon",
    );

    await page.getByRole("radio", { name: /shows/i }).check();
    await expect(
      page.getByRole("heading", { name: "Static Channel 1", exact: true }),
    ).toBeVisible();
  });

  test("every category is searchable: shows, games, books, and music", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("anything");

    const expectations: Array<[RegExp, string]> = [
      [/shows/i, "Mononoke Hour 1"],
      [/video games/i, "Pixel Quest 1"],
      [/books/i, "Paper Trails 1"],
      [/music/i, "Moon Choir 1"],
    ];
    for (const [chip, firstTitle] of expectations) {
      await page.getByRole("radio", { name: chip }).check();
      await expect(
        page.getByRole("heading", { name: firstTitle, exact: true }),
      ).toBeVisible();
    }
  });

  test("the Shows shelf merges live-action TV with anime", async ({ page }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("anything");
    await page.getByRole("radio", { name: /shows/i }).check();

    // Both upstreams surface in one feed: a TV result and an anime one.
    await expect(
      page.getByRole("heading", { name: "Static Channel 1", exact: true }),
    ).toBeVisible();
    const animeCard = page
      .getByRole("listitem")
      .filter({
        has: page.getByRole("heading", {
          name: "Mononoke Hour 1",
          exact: true,
        }),
      });
    await expect(animeCard).toBeVisible();
    // Anime keeps its studio as the secondary line.
    await expect(animeCard).toContainText("Fixture Animation");
  });

  test("the Books shelf merges print books with manga", async ({ page }) => {
    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("anything");
    await page.getByRole("radio", { name: /books/i }).check();

    // Open Library print result and an AniList manga result in one feed.
    await expect(
      page.getByRole("heading", { name: "Paper Trails 1", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Inked Saga 1", exact: true }),
    ).toBeVisible();
  });

  test("the library is reachable from the nav", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page
      .getByRole("banner")
      .getByRole("link", { name: /library/i })
      .click();
    await expect(page).toHaveURL(/\/library/);
    await expect(
      page.getByRole("heading", { level: 1, name: /library/i }),
    ).toBeVisible();
  });
});
