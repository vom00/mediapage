import { expect, test, type Page } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  signUpAndOnboard,
} from "./support/helpers";

// The physical shelf: a ledge with standing cases, motion that exists
// for those who want it and vanishes under reduced motion.

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

async function addAnimePicks(page: Page, count: number) {
  await page.goto(BASE_URL + "/library");
  await page.getByLabel(/search the library/i).fill("mononoke");
  await page.getByRole("radio", { name: /shows/i }).check();
  for (let n = 1; n <= count; n++) {
    await page
      .getByRole("button", { name: new RegExp(`Mononoke Hour ${n}$`) })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /add to my shows shelf/i }).click();
    await dialog.getByText(/added to your shows shelf/i).waitFor();
    await dialog.getByRole("button", { name: /close/i }).click();
  }
}

test.describe("physical shelf", () => {
  test("a full shelf renders a ledge with five standing cases and overflows nothing", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await signUpAndOnboard(page, "shelfful", "Shelf Full");
    await addAnimePicks(page, 5);

    await page.goto(BASE_URL + "/u/shelfful");
    const animeShelf = page.getByRole("region", { name: /shows/i });
    await expect(
      animeShelf.locator('[data-testid="shelf-case"]'),
    ).toHaveCount(5);
    // One continuous board: a plank segment under every case slot.
    expect(
      await animeShelf.locator('[data-testid="shelf-plank"]').count(),
    ).toBeGreaterThanOrEqual(5);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(
        animeShelf.locator('[data-testid="shelf-case"]').first(),
      ).toBeVisible();
      const overflow = await page.evaluate(() => {
        document.getAnimations().forEach((animation) => {
          const end = Number(animation.effect?.getComputedTiming().endTime);
          if (Number.isFinite(end)) animation.finish();
          else animation.cancel();
        });
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `overflow @ ${viewport.width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("a case lifts on hover, and stays put under reduced motion", async ({
    page,
    browser,
  }) => {
    await signUpAndOnboard(page, "lifter", "The Lifter");
    await addAnimePicks(page, 1);

    async function hoverAndMeasure(reduce: boolean) {
      const visitor = await browser.newPage(
        reduce ? { reducedMotion: "reduce" } : {},
      );
      await visitor.goto(BASE_URL + "/u/lifter");
      const theCase = visitor.locator('[data-testid="shelf-case"]').first();
      await theCase.waitFor();
      await theCase.hover();
      await visitor.waitForTimeout(420);
      const transform = await theCase.evaluate(
        (el) => getComputedStyle(el).transform,
      );
      await visitor.close();
      return transform;
    }

    const lifted = await hoverAndMeasure(false);
    expect(lifted).not.toBe("none");
    expect(lifted).not.toBe("matrix(1, 0, 0, 1, 0, 0)");

    const still = await hoverAndMeasure(true);
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(still);
  });

  test("a pick takes its category's physical form on the shelf", async ({
    page,
  }) => {
    await signUpAndOnboard(page, "forms", "Forms");
    await addAnimePicks(page, 1);

    await page.goto(BASE_URL + "/u/forms");
    const shelf = page.getByRole("region", { name: /shows/i });
    // Shows play on a screen.
    const piece = shelf.locator('[data-piece="tv"]').first();
    await expect(piece).toBeVisible();
    // The cover art still carries its descriptive alt.
    await expect(
      piece.getByRole("img", { name: /mononoke hour 1/i }),
    ).toBeVisible();
  });

  test("touch devices get no phantom hover lift", async ({
    page,
    browser,
  }) => {
    await signUpAndOnboard(page, "toucher", "The Toucher");
    await addAnimePicks(page, 1);

    // A touch-first device: pointer is coarse, hover is unreliable.
    const touch = await browser.newPage({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    await touch.goto(BASE_URL + "/u/toucher");
    const theCase = touch.locator('[data-testid="shelf-case"]').first();
    await theCase.waitFor();
    await theCase.hover();
    await touch.waitForTimeout(350);
    const transform = await theCase.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    await touch.close();
  });

  test("reorder slides the cases only when motion is allowed", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const email = await signUpAndOnboard(page, "slider", "The Slider");
    await addAnimePicks(page, 2);

    await page.goto(BASE_URL + "/u/slider");
    const shelf = page.getByRole("region", { name: /shows/i });
    await shelf
      .getByRole("button", { name: /move mononoke hour 2 earlier/i })
      .click();
    const animating = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target;
            return (
              target instanceof Element &&
              target.closest('[data-testid="shelf-case"]') !== null
            );
          }).length,
    );
    expect(animating).toBeGreaterThan(0);
    await expect(
      shelf.getByRole("list").getByRole("heading").nth(0),
    ).toHaveText("Mononoke Hour 2");

    // The same action under reduced motion: order changes, nothing slides.
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/login");
    await reduced.getByLabel(/email/i).fill(email);
    await reduced.getByLabel(/^password/i).fill("password-123");
    await reduced.getByRole("button", { name: /^log in$/i }).click();
    await reduced.waitForURL(BASE_URL + "/");
    await reduced.goto(BASE_URL + "/u/slider");
    const reducedShelf = reduced.getByRole("region", { name: /shows/i });
    await reducedShelf
      .getByRole("button", { name: /move mononoke hour 1 earlier/i })
      .click();
    const reducedAnimating = await reduced.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => {
            const target = (a.effect as KeyframeEffect | null)?.target;
            return (
              target instanceof Element &&
              target.closest('[data-testid="shelf-case"]') !== null
            );
          }).length,
    );
    expect(reducedAnimating).toBe(0);
    await expect(
      reducedShelf.getByRole("list").getByRole("heading").nth(0),
    ).toHaveText("Mononoke Hour 1");
    await reduced.close();
  });
});
