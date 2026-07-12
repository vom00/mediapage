import { expect, test } from "@playwright/test";
import { BASE_URL } from "./support/helpers";

// The immersive landing: a candlelit dolly through five shelf bays,
// live CTAs, ambient motion that vanishes under reduced motion.

test.describe("immersive landing", () => {
  test("the hero stands at the mouth of the stacks with live CTAs", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/");

    await expect(
      page.getByRole("heading", { level: 1, name: /five favorites/i }),
    ).toBeVisible();

    // The 3D world exists and is purely decorative.
    const world = page.locator('[data-testid="dolly-world"]');
    await expect(world).toHaveCount(1);
    await expect(world).toHaveAttribute("aria-hidden", "true");
    // Five bays, each lit by a pair of candle flames.
    expect(await world.locator(".dolly-flame").count()).toBeGreaterThanOrEqual(10);

    // Two "Start your shelf" CTAs exist (hero + finale); the hero one
    // is the visible one at the top of the walk.
    const start = page.getByRole("link", { name: /start your shelf/i }).first();
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute("href", "/login");
    await expect(
      page.getByRole("link", { name: /browse the library/i }),
    ).toHaveAttribute("href", "/library");

    // The five-shelf index still follows below the fold. (The bay
    // labels inside the aria-hidden world duplicate these names, so
    // scope to the index.)
    await expect(
      page
        .locator('section[aria-labelledby="shelves-heading"]')
        .getByText("Video Games", { exact: true }),
    ).toBeVisible();
  });

  test("the candles flicker and the walk is long, except under reduced motion", async ({
    browser,
  }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const flicker = await animated
      .locator(".dolly-flame")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(flicker).toContain("candle-flicker");
    // The camera script stretches the track into a real walk.
    await animated.waitForFunction(() => {
      const track = document.querySelector(".dolly-track");
      return (
        track !== null &&
        track.getBoundingClientRect().height > window.innerHeight * 2
      );
    });
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    const reducedFlicker = await reduced
      .locator(".dolly-flame")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(reducedFlicker).toBe("none");
    // The walk collapses to a single static screen.
    const collapsed = await reduced.locator(".dolly-track").evaluate(
      (el) => el.getBoundingClientRect().height <= window.innerHeight + 1,
    );
    expect(collapsed).toBe(true);
    await reduced.close();
  });

  test("the walk can be skipped straight to the finale", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page
      .getByRole("button", { name: /skip to the five shelves/i })
      .click();
    // The damped camera glides to the end; the finale rises.
    await expect(
      page.getByRole("heading", { name: /the next shelf is yours/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /see the five shelves/i }),
    ).toHaveAttribute("href", "#shelves-heading");
  });

  test("the colored library hall stands behind the login page too", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/login");
    const backdrop = page.locator('[data-testid="library-backdrop"]');
    await expect(backdrop).toHaveCount(1);
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(await backdrop.locator(".library-row").count()).toBeGreaterThanOrEqual(3);
    // The login card still sits cleanly on top.
    await expect(
      page.getByRole("heading", { name: /^log in$/i }),
    ).toBeVisible();
  });

  test("a 16-bit explorer and ladder inhabit the library on login", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/login");
    await expect(
      page.locator('[data-testid="library-explorer"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-testid="library-ladder"]')).toHaveCount(1);
    // It lives inside the decorative, screen-reader-hidden backdrop.
    const hidden = await page
      .locator('[data-testid="library-explorer"]')
      .evaluate((el) => el.closest("[aria-hidden]") !== null);
    expect(hidden).toBe(true);
  });

  test("the explorer walks normally and freezes under reduced motion", async ({
    browser,
  }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/login");
    const name = await animated
      .locator('[data-testid="library-explorer"]')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toContain("explorer-journey");
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/login");
    const reducedName = await reduced
      .locator('[data-testid="library-explorer"]')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(reducedName).toBe("none");
    await reduced.close();
  });

  test("the hero overflows nothing at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL + "/");
    await expect(
      page.getByRole("heading", { level: 1, name: /five favorites/i }),
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
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
