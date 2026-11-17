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

test.describe("small motion", () => {
  test("the chip highlight follows the pointer, and the selection never does", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    const chips = page.locator("fieldset label");
    const marked = () =>
      chips.evaluateAll((els) =>
        els.findIndex((el) => el.querySelector("[aria-hidden]")),
      );
    expect(await marked()).toBe(0);

    await chips.nth(2).hover();
    await expect.poll(marked).toBe(2);
    await expect(page.getByRole("radio", { name: /movies/i })).toBeChecked();

    // A keyboard change wins over the resting pointer.
    await page.getByRole("radio", { name: /movies/i }).press("ArrowRight");
    await expect(page.getByRole("radio", { name: /shows/i })).toBeChecked();
    await expect.poll(marked).toBe(1);

    await page.mouse.move(5, 5);
    await expect.poll(marked).toBe(1);
  });

  test("the nav bar slides sideways to the new page, even from a scrolled one", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/library");
    await page.evaluate(() => window.scrollTo(0, 600));
    const tops = await page.evaluate(async () => {
      const seen: number[] = [];
      const start = performance.now();
      document.querySelector<HTMLAnchorElement>('nav a[href="/people"]')!.click();
      await new Promise<void>((done) => {
        const frame = () => {
          const bar = document.querySelector(".nav-word [aria-hidden]");
          if (bar) seen.push(Math.round(bar.getBoundingClientRect().top));
          if (performance.now() - start < 700) requestAnimationFrame(frame);
          else done();
        };
        frame();
      });
      return seen;
    });
    await expect(page).toHaveURL(/\/people$/);
    await expect(
      page.locator('nav a[href="/people"] .nav-word [aria-hidden]'),
    ).toBeVisible();
    // It never leaves its line under the words.
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  });

  test("the eye shows and hides the password without leaving the field", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/login");
    const field = page.getByLabel(/^password/i);
    const eye = page.getByRole("button", { name: "Show password" });
    await field.fill("not-a-real-one");
    await expect(field).toHaveAttribute("type", "password");
    await eye.click();
    await expect(field).toHaveAttribute("type", "text");
    await expect(eye).toHaveAttribute("aria-pressed", "true");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("not-a-real-one");
    await eye.click();
    await expect(field).toHaveAttribute("type", "password");
  });
});
