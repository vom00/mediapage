import { expect, test } from "@playwright/test";
import { BASE_URL } from "./support/helpers";

// The landing: a hero over a low-poly media room, a walk through that
// room by scrolling, one pinned "how a profile works" section, the five
// shelves on the light band, and a close. Live actions over a poster that
// is in the server HTML; the 3D canvas is decoration that may or may not
// arrive; the walk collapses to one still screen under reduced motion.

test.describe("landing", () => {
  test("the hero is one screen with a headline, a lead and two actions", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/");

    const h1 = page.getByRole("heading", { level: 1, name: /five favorites/i });
    await expect(h1).toBeVisible();
    // A plain sentence, weight 500, no italic or coloured word.
    const style = await h1.evaluate((el) => ({
      weight: getComputedStyle(el).fontWeight,
      italic: el.querySelectorAll("em, i").length,
    }));
    expect(style.weight).toBe("500");
    expect(style.italic).toBe(0);

    // The room is the hero's picture and is purely decorative.
    const scene = page.locator('[data-testid="room-scene"]');
    await expect(scene).toHaveCount(1);
    await expect(scene).toHaveAttribute("aria-hidden", "true");

    // The two actions sit on the first screen.
    const start = page.getByRole("link", { name: /start your shelf/i }).first();
    await expect(start).toBeVisible();
    await expect(start).toHaveAttribute("href", "/login");
    await expect(start).toHaveClass(/btn-primary/);
    const browse = page.getByRole("link", { name: /browse the library/i });
    await expect(browse).toHaveAttribute("href", "/library");
    const fold = await page.evaluate(() => window.innerHeight);
    for (const link of [start, browse]) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(fold);
    }

    // No eyebrow above the headline, no scroll hint.
    await expect(page.getByText(/scroll to walk the room/i)).toHaveCount(0);
    await expect(page.getByText(/your taste, on one page/i)).toHaveCount(0);
  });

  test("the headline enters line by line, and not under reduced motion", async ({
    browser,
  }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const name = await animated
      .locator(".room-headline .enter-line > span")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("enter-line-rise");
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    const reducedName = await reduced
      .locator(".room-headline .enter-line > span")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(reducedName).toBe("none");
    await reduced.close();
  });

  test("the server HTML carries the headline and the room's poster", async ({
    request,
  }) => {
    // Nothing above the fold waits on WebGL or client JS.
    const html = await (await request.get(BASE_URL + "/")).text();
    expect(html).toMatch(/Your five favorites/);
    expect(html).toContain("/landing/room-poster.webp");
    expect(html).toContain('data-testid="room-scene"');
  });

  test("the walk is long, except under reduced motion", async ({ browser }) => {
    const animated = await browser.newPage();
    await animated.goto(BASE_URL + "/");
    const long = await animated.locator(".room-track").evaluate(
      (el) => el.getBoundingClientRect().height > window.innerHeight * 4,
    );
    expect(long).toBe(true);
    await animated.close();

    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    // One still screen: the stage does not pin, the room stays a poster
    // and never mounts a canvas, and the walk's chrome is gone.
    const stage = await reduced.locator(".room-stage").evaluate((el) => ({
      position: getComputedStyle(el).position,
      height: el.getBoundingClientRect().height,
      viewport: window.innerHeight,
    }));
    expect(stage.position).not.toBe("sticky");
    expect(stage.height).toBeLessThanOrEqual(Math.max(stage.viewport, 560) + 1);
    await reduced.waitForTimeout(1500);
    await expect(reduced.locator('[data-testid="room-scene"] canvas')).toHaveCount(0);
    await expect(
      reduced.locator('[data-testid="room-scene"]'),
    ).toHaveAttribute("data-mode", "poster");
    await expect(
      reduced.getByRole("button", { name: /skip to the five shelves/i }),
    ).toBeHidden();
    // The close is still there, as ordinary page.
    await expect(
      reduced.getByRole("heading", { name: /the next shelf is yours/i }),
    ).toBeVisible();
    await reduced.close();
  });

  test("the walk can be skipped to the five shelves", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page
      .getByRole("button", { name: /skip to the five shelves/i })
      .click();
    await expect(page.locator("#shelves-heading")).toBeInViewport();
    await expect(
      page.getByRole("link", { name: /see the five shelves/i }),
    ).toHaveAttribute("href", "#shelves-heading");
  });

  test("the five shelves sit on the light band, named without numbers", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/");
    const band = page.locator('section[aria-labelledby="shelves-heading"]');
    await expect(band).toHaveClass(/bg-inv-bg/);
    for (const name of ["Movies", "Shows", "Music", "Video Games", "Books"]) {
      await expect(band.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(band.getByText(/^0?[1-5] \/ 05$/)).toHaveCount(0);
  });

  test("each shelf on the band opens the library on its category, and the band fits one screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL + "/");
    const band = page.locator('section[aria-labelledby="shelves-heading"]');
    const links = band.getByRole("link");
    await expect(links).toHaveCount(5);
    for (const [name, category] of [
      ["Movies", "movie"],
      ["Shows", "shows"],
      ["Music", "music"],
      ["Video Games", "game"],
      ["Books", "book"],
    ]) {
      await expect(
        band.getByRole("link", { name: new RegExp(`^${name}`) }),
      ).toHaveAttribute("href", `/library?category=${category}`);
    }

    // One screen under the 64px nav: the heading and all five rows show
    // together when the band is scrolled to.
    const box = await band.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const inner = el.firstElementChild!.getBoundingClientRect();
      return { height: r.height, inner: inner.height, viewport: window.innerHeight };
    });
    expect(box.height).toBeLessThanOrEqual(box.viewport - 64 + 1);
    expect(box.inner).toBeLessThanOrEqual(box.height + 1);

    await links.nth(1).click();
    await expect(page).toHaveURL(/\/library\?category=shows$/);
    await expect(page.getByRole("radio", { name: /shows/i })).toBeChecked();
  });

  test("a shelf's hue is never a dot beside its name", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    expect(await page.locator(".lp-dot, .shelf-mark").count()).toBe(0);
    await page.goto(BASE_URL + "/library");
    // The category chips are plain words, and the chosen one is exactly
    // the size it was before it was chosen.
    const chips = page.locator("fieldset label");
    await expect(chips).toHaveCount(5);
    const sizes = await chips.evaluateAll((els) =>
      els.map((el) => {
        const chip = el.getBoundingClientRect();
        const mark = el.querySelector("[aria-hidden]")?.getBoundingClientRect();
        return { h: chip.height, w: chip.width, mh: mark?.height, mw: mark?.width };
      }),
    );
    expect(new Set(sizes.map((s) => Math.round(s.h))).size).toBe(1);
    const chosen = sizes.find((s) => s.mh !== undefined)!;
    expect(Math.abs(chosen.mh! - chosen.h)).toBeLessThan(0.5);
    expect(Math.abs(chosen.mw! - chosen.w)).toBeLessThan(0.5);
  });

  test("the formats row moves in a loop with a pause, and rests as a wrapped row", async ({
    browser,
  }) => {
    const animated = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await animated.goto(BASE_URL + "/");
    const row = animated.locator(".lp-mq");
    await row.scrollIntoViewIfNeeded();
    await expect(row).toHaveAttribute("data-live", "true");
    await expect(row).toHaveAttribute("data-on", "true");
    const list = animated.getByRole("list", { name: "What the shelves hold" });
    await expect(list.getByRole("listitem")).toHaveCount(7);
    const track = row.locator(".lp-mq-track").first();
    const state = () =>
      track.evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.animationName} ${s.animationPlayState}`;
      });
    // Hovering holds it too, so keep the pointer clear of the row.
    await animated.mouse.move(10, 10);
    await expect.poll(state).toBe("lp-mq running");
    await animated.getByRole("button", { name: "Pause the moving row" }).click();
    await animated.mouse.move(10, 10);
    await expect.poll(state).toBe("lp-mq paused");
    await expect(
      animated.getByRole("button", { name: "Play the moving row" }),
    ).toBeVisible();
    await animated.close();

    const reduced = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await reduced.goto(BASE_URL + "/");
    const still = reduced.locator(".lp-mq");
    await expect(still).not.toHaveAttribute("data-live", "true");
    await expect(
      reduced.getByRole("list", { name: "What the shelves hold" }).getByRole("listitem"),
    ).toHaveCount(7);
    expect(
      await still
        .locator(".lp-mq-track")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    await expect(
      reduced.getByRole("button", { name: /the moving row/i }),
    ).toBeHidden();
    await reduced.close();
  });

  test("how a profile works pins, scrubs its frames and holds one loop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL + "/");
    const section = page.locator(".lp-chap");
    await expect(section).toHaveAttribute("data-pinned", "true");

    const pin = await section.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      sticky: getComputedStyle(el.querySelector(".lp-chap-pin")!).position,
      viewport: window.innerHeight,
    }));
    expect(pin.sticky).toBe("sticky");
    expect(pin.height).toBeGreaterThan(pin.viewport * 1.8);

    const frameOpacity = async (name: string) =>
      Number(
        await page
          .locator(`.lp-frame[data-frame="${name}"]`)
          .evaluate((el) => getComputedStyle(el).opacity),
      );
    const scrollTo = async (fraction: number) => {
      await page.evaluate((f) => {
        const el = document.querySelector(".lp-chap") as HTMLElement;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(
          0,
          top - 64 + (el.offsetHeight - window.innerHeight) * f + (f ? 64 : 0),
        );
      }, fraction);
      await page.waitForTimeout(300);
    };

    // Scrubbed to the scrollbar: each step's frame is the open one at
    // its own stretch of the scroll, and it runs backwards on the way up.
    await scrollTo(0);
    await expect.poll(() => frameOpacity("shelf")).toBeGreaterThan(0.95);
    await expect.poll(() => frameOpacity("note")).toBeLessThan(0.05);
    await scrollTo(0.5);
    await expect.poll(() => frameOpacity("note")).toBeGreaterThan(0.95);
    await expect.poll(() => frameOpacity("shelf")).toBeLessThan(0.05);
    await scrollTo(1);
    await expect.poll(() => frameOpacity("people")).toBeGreaterThan(0.95);
    await scrollTo(0.5);
    await expect.poll(() => frameOpacity("note")).toBeGreaterThan(0.95);

    // One timed loop, with a pause button that freezes it.
    await scrollTo(0);
    const pause = page.getByRole("button", { name: "Pause animation" });
    await expect(pause).toBeVisible();
    const box = await pause.boundingBox();
    expect(Math.round(box!.width)).toBe(32);
    expect(Math.round(box!.height)).toBe(32);
    const mover = page.locator(".lp-cv-left");
    expect(
      await mover.evaluate((el) => getComputedStyle(el).animationDuration),
    ).toBe("3.2s");
    await pause.click();
    await expect(
      page.getByRole("button", { name: "Play animation" }),
    ).toBeVisible();
    expect(
      await mover.evaluate((el) => getComputedStyle(el).animationPlayState),
    ).toBe("paused");
    await page.getByRole("button", { name: "Play animation" }).click();

    // The steps work as an accordion: only the open one gives its body
    // room, and the column keeps one height while they trade places.
    const folds = () =>
      page
        .locator(".lp-chap-fold")
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
    const column = () =>
      page.locator(".lp-chap-more").evaluate((el) => Math.round(el.getBoundingClientRect().bottom));
    await scrollTo(0);
    await expect.poll(async () => (await folds())[0]).toBeGreaterThan(40);
    expect((await folds()).slice(1)).toEqual([0, 0]);
    const restingBottom = await column();
    await scrollTo(1);
    await expect.poll(async () => (await folds())[2]).toBeGreaterThan(40);
    expect((await folds()).slice(0, 2)).toEqual([0, 0]);
    expect(Math.abs((await column()) - restingBottom)).toBeLessThanOrEqual(1);

    // The people frame holds the second loop: its first Follow is pressed
    // and released on the same cycle, under the same pause.
    const follow = page.locator(".lp-follow-loop");
    expect(
      await follow.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("lp-follow-press");
    await page.getByRole("button", { name: "Pause animation" }).click();
    expect(
      await follow.evaluate((el) => getComputedStyle(el).animationPlayState),
    ).toBe("paused");
  });

  test("the chapters rest stacked and visible under reduced motion and on phones", async ({
    browser,
  }) => {
    const reduced = await browser.newPage({ reducedMotion: "reduce" });
    await reduced.goto(BASE_URL + "/");
    await expect(reduced.locator(".lp-chap")).not.toHaveAttribute(
      "data-pinned",
      "true",
    );
    for (const frame of ["shelf", "note", "people"]) {
      const f = reduced.locator(`.lp-frame[data-frame="${frame}"]`);
      await expect(f).toBeVisible();
      expect(await f.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    }
    await expect(
      reduced.getByRole("button", { name: /pause animation/i }),
    ).toBeHidden();
    await reduced.close();

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await phone.goto(BASE_URL + "/");
    await expect(phone.locator(".lp-chap")).not.toHaveAttribute(
      "data-pinned",
      "true",
    );
    await expect(phone.locator(".lp-frame").first()).toBeVisible();
    await phone.close();
  });

  test("the close has the heading and one primary action", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    const close = page.locator('section[aria-labelledby="close-heading"]');
    await expect(
      close.getByRole("heading", { name: /the next shelf is yours/i }),
    ).toBeVisible();
    await expect(close.getByRole("link")).toHaveCount(1);
    await expect(
      close.getByRole("link", { name: /start your shelf/i }),
    ).toHaveAttribute("href", "/login");
  });

  test("nothing on the landing is revealed by scrolling it into view", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/");
    expect(await page.locator(".reveal").count()).toBe(0);
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

  test("the hero overflows nothing at phone, tablet and wide widths", async ({
    page,
  }) => {
    for (const width of [375, 768, 1920]) {
      await page.setViewportSize({ width, height: 800 });
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
    }
  });
});
