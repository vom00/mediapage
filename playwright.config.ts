import { defineConfig, devices } from "@playwright/test";

// Base URL is parameterized here and overridable per run via PW_BASE_URL.
// E2E gets its own Next instance on 3100 (with fixture-source env)
// so the developer preview on 3000 is never disturbed.
export const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

// Visible browser during development, per project policy.
// Set HEADLESS=1 for CI or unattended runs.
const HEADLESS = process.env.HEADLESS === "1";

// This machine cannot run Playwright's bundled Chrome for Testing
// (Windows side-by-side activation fails), so default to system Edge.
// Set PW_BROWSER_CHANNEL=chromium to use the bundled browser elsewhere.
const channelEnv = process.env.PW_BROWSER_CHANNEL ?? "msedge";
const CHANNEL = channelEnv === "chromium" ? undefined : channelEnv;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // E2E tests share one emulator instance and clear its data in
  // beforeEach hooks, so they must not run concurrently.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    headless: HEADLESS,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: CHANNEL },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/mock-sources.mjs",
      url: "http://127.0.0.1:4601/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- -p 3100",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_FIREBASE_EMULATORS: "1",
        NEXT_DIST_DIR: ".next-e2e",
        TMDB_API_KEY: "e2e-fixture-key",
        TMDB_BASE_URL: "http://127.0.0.1:4601",
        TMDB_IMAGE_BASE: "http://127.0.0.1:4601/img",
        ANILIST_BASE_URL: "http://127.0.0.1:4601/anilist",
        JIKAN_BASE_URL: "http://127.0.0.1:4601/jikan",
        STEAM_BASE_URL: "http://127.0.0.1:4601",
        STEAM_IMAGE_BASE: "http://127.0.0.1:4601/img",
        OPENLIBRARY_BASE_URL: "http://127.0.0.1:4601",
        OPENLIBRARY_COVER_BASE: "http://127.0.0.1:4601/img",
        DEEZER_BASE_URL: "http://127.0.0.1:4601",
      },
    },
  ],
});
