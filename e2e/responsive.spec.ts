import { expect, test, type Page } from "@playwright/test";
import {
  AUTH_CLEAR,
  BASE_URL,
  FIRESTORE_CLEAR,
  postRecommendationViaDialog,
  signUpAndOnboard,
} from "./support/helpers";

// Required journey 8: profile and library at three viewports,
// screenshots captured, no horizontal overflow anywhere.

const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "phone", width: 375, height: 667 },
];

async function assertNoHorizontalOverflow(page: Page, context: string) {
  const result = await page.evaluate(() => {
    // Measure the resting layout, not a mid-animation frame.
    // (Infinite loops like skeleton pulses cannot be finished.)
    document.getAnimations().forEach((animation) => {
      const end = Number(animation.effect?.getComputedTiming().endTime);
      if (Number.isFinite(end)) animation.finish();
      else animation.cancel();
    });
    const el = document.documentElement;
    const limit = el.clientWidth;
    const offenders: string[] = [];
    if (el.scrollWidth > limit) {
      const inScroller = (node: Element) => {
        for (let p = node.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") {
            return true;
          }
        }
        return false;
      };
      for (const node of document.querySelectorAll("body *")) {
        const r = node.getBoundingClientRect();
        if (r.right > limit + 0.5 && !inScroller(node)) {
          offenders.push(
            `${node.tagName}.${String(node.className).slice(0, 70)} right=${Math.round(r.right)}`,
          );
        }
      }
    }
    return { overflow: el.scrollWidth - limit, offenders: offenders.slice(0, 6) };
  });
  expect(
    result.overflow,
    `${context} has horizontal overflow; offenders: ${result.offenders.join(" | ")}`,
  ).toBeLessThanOrEqual(0);
}

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test("profile and library hold up at desktop, tablet, and phone sizes", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // Build a lived-in profile: two picks and a recommendation.
  await signUpAndOnboard(page, "responsive", "Responsive Tester");
  await page.goto(BASE_URL + "/library");
  await page.getByLabel(/search the library/i).fill("mononoke");
  await page.getByRole("radio", { name: /shows/i }).check();
  for (const n of [1, 2]) {
    await page
      .getByRole("button", { name: new RegExp(`Mononoke Hour ${n}$`) })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /add to my shows shelf/i })
      .click();
    await dialog.getByText(/added to your shows shelf/i).waitFor();
    await dialog.getByRole("button", { name: /close/i }).click();
  }
  await postRecommendationViaDialog(page, 3, "Holds up at every size.");

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await page.goto(BASE_URL + "/u/responsive");
    await expect(
      page.getByRole("heading", { name: "Responsive Tester" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, `profile @ ${viewport.name}`);
    await page.screenshot({
      path: `e2e-screenshots/profile-${viewport.name}.png`,
      fullPage: false,
    });

    await page.goto(BASE_URL + "/library");
    await page.getByLabel(/search the library/i).fill("paper moon");
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await assertNoHorizontalOverflow(page, `library @ ${viewport.name}`);
    await page.screenshot({
      path: `e2e-screenshots/library-${viewport.name}.png`,
      fullPage: false,
    });
  }
});
