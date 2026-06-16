// One-off visual check: capture the library in its fixture-backed
// state (3100) and the unconfigured state on the preview (3000).
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "msedge" });

async function shoot(url, viewport, file, expectText) {
  const page = await browser.newPage({ viewport });
  await page.goto(url);
  await page.getByLabel(/search the library/i).fill("paper moon");
  await page.getByText(expectText).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file });
  await page.close();
  console.log("captured", file);
}

await shoot(
  "http://localhost:3100/library",
  { width: 1440, height: 900 },
  "shot-library-desktop.png",
  /results/i,
);
await shoot(
  "http://localhost:3100/library",
  { width: 375, height: 667 },
  "shot-library-mobile.png",
  /results/i,
);
await shoot(
  "http://localhost:3000/library",
  { width: 1440, height: 900 },
  "shot-library-unconfigured.png",
  /not configured/i,
);

await browser.close();
