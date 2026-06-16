import { expect, test } from "@playwright/test";
import { BASE_URL } from "./support/helpers";

// The immersive landing: a dark library hall behind the hero, live
// CTAs, ambient motion that vanishes under reduced motion.

test.describe("immersive landing", () => {
  test("the hero stands in a library hall with live CTAs", async ({ page }) => {
    await page.goto(BASE_URL + "/");

    await expect(
      page.getByRole("heading", { level: 1, name: /five favorites/i }),
    ).toBeVisible();

    // The backdrop exists and is purely decorative.
    const backdrop = page.locator('[data-testid="library-backdrop"]');
    await expect(backdrop).toHaveCount(1);
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(await backdrop.locator(".library-row").count()).toBeGreaterThanOrEqual(3);

    const start = page.getByRole("link", { name: /start your shelf/i });
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute("href", "/login");
    await expect(
      page.getByRole("link", { name: /browse the library/i }),
    ).toHaveAttribute("href", "/library");

    // The six-shelf index still follows below the fold.
    await expect(
      page.getByRole("main").getByText("Video Games", { exact: true }),
    ).toBeVisible();
  });

  test("the hall drifts with ambient motion, except under reduced motion", async ({
    browser,
  }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const driftName = await animated
      .locator(".library-row")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(driftName).toContain("library-drift");
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    const reducedDrift = await reduced
      .locator(".library-row")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(reducedDrift).toBe("none");
    await reduced.close();
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

  test("a 16-bit explorer and ladder inhabit the library on home and login", async ({
    page,
  }) => {
    for (const path of ["/", "/login"]) {
      await page.goto(BASE_URL + path);
      await expect(
        page.locator('[data-testid="library-explorer"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('[data-testid="library-ladder"]'),
      ).toHaveCount(1);
      // It lives inside the decorative, screen-reader-hidden backdrop.
      const hidden = await page
        .locator('[data-testid="library-explorer"]')
        .evaluate((el) => el.closest("[aria-hidden]") !== null);
      expect(hidden).toBe(true);
    }
  });

  test("the explorer walks normally and freezes under reduced motion", async ({
    browser,
  }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const name = await animated
      .locator('[data-testid="library-explorer"]')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toContain("explorer-journey");
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
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
