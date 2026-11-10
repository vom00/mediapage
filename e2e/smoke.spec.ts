import { expect, test } from "@playwright/test";

// Parameterized base URL; override per run with PW_BASE_URL.
const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

test.describe("home page shell", () => {
  test("serves the monochrome mediapage shell", async ({ page }) => {
    await page.goto(BASE_URL + "/");

    // Identity
    await expect(page).toHaveTitle(/mediapage/i);

    // Landmarks: glass nav with wordmark, main content, attribution footer
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
    await expect(
      header.getByRole("link", { name: /mediapage/i }),
    ).toBeVisible();

    const main = page.getByRole("main");
    await expect(main).toBeVisible();
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(
      page.getByText(/uses the TMDB API but is not endorsed/i),
    ).toBeVisible();

    // Monochrome tokens are actually applied: body background is --bg
    const bodyBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).toBe("rgb(17, 17, 17)");

    // All five shelves are presented on the shell. The walk's captions
    // repeat the names over the 3D room, so read them from the index.
    const shelves = main.locator('section[aria-labelledby="shelves-heading"]');
    for (const category of [
      "Movies",
      "Shows",
      "Music",
      "Video Games",
      "Books",
    ]) {
      await expect(shelves.getByText(category, { exact: true })).toBeVisible();
    }

    // No horizontal overflow on the page body
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
