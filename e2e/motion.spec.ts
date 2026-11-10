import { expect, test } from "@playwright/test";
import { BASE_URL } from "./support/helpers";

// The depth-and-motion contract: choreography exists for people who
// want it and disappears for people who asked their OS to reduce it.

test.describe("motion and reduced motion", () => {
  test("the landing entrance animates normally and is disabled under reduced motion", async ({
    browser,
  }) => {
    // The hero's headline rises line by line out of its masks, then the
    // lead fades up (enter-line / enter-up in globals.css). The landing
    // has no scroll-triggered .reveal.
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const name = await animated
      .locator(".enter-line > span")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("enter-line-rise");
    const lead = await animated
      .locator(".room-lede")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(lead).toBe("enter-fade-up");
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    const reducedName = await reduced
      .locator(".enter-line > span")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(reducedName).toBe("none");
    await reduced.close();
  });

  test("the detail dialog has an entrance transition, except under reduced motion", async ({
    browser,
  }) => {
    async function openDialogAndMeasure(reduce: boolean) {
      const page = await browser.newPage(
        reduce ? { reducedMotion: "reduce" } : {},
      );
      await page.goto(BASE_URL + "/library");
      await page.getByLabel(/search the library/i).fill("paper");
      await page.getByRole("button", { name: /Paper Moon 1$/ }).click();
      const duration = await page
        .getByRole("dialog")
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      await page.close();
      return duration;
    }

    const normal = await openDialogAndMeasure(false);
    expect(parseFloat(normal)).toBeGreaterThan(0.1);

    const reduced = await openDialogAndMeasure(true);
    expect(parseFloat(reduced)).toBeLessThan(0.01);
  });

  test("cards lift on hover, except under reduced motion", async ({
    browser,
  }) => {
    async function hoverAndMeasure(reduce: boolean) {
      const page = await browser.newPage(
        reduce ? { reducedMotion: "reduce" } : {},
      );
      await page.goto(BASE_URL + "/library");
      await page.getByLabel(/search the library/i).fill("paper");
      const card = page.locator("article").first();
      await card.waitFor();
      // Hover the card's overlay button, like a real pointer would.
      await page
        .getByRole("button", { name: /view details for paper moon 1$/i })
        .hover();
      // Let the 180ms transition finish.
      await page.waitForTimeout(450);
      // Tailwind v4 lifts via the standalone translate property (2px up);
      // rotate is read too so a tilt shows up as a "deg" value.
      const movement = await card.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.transform, s.translate, s.rotate].join("|");
      });
      await page.close();
      return movement;
    }

    const LIFTED = /-2px/;

    const normal = await hoverAndMeasure(false);
    expect(normal).toMatch(LIFTED);
    // The card no longer tilts at all.
    expect(normal).not.toMatch(/deg/);

    const reduced = await hoverAndMeasure(true);
    expect(reduced).not.toMatch(LIFTED);
  });
});
