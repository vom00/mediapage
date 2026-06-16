import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

// Parameterized base URL; override per run with PW_BASE_URL.
const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

const FIRESTORE_CLEAR =
  "http://127.0.0.1:8080/emulator/v1/projects/demo-mediapage/databases/(default)/documents";
const AUTH_CLEAR =
  "http://127.0.0.1:9099/emulator/v1/projects/demo-mediapage/accounts";

const AVATAR_FIXTURE = path.join(__dirname, "fixtures", "avatar.png");

let userCounter = 0;
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${userCounter++}@example.com`;
}

// Our inline error alerts; excludes Next.js's route announcer,
// which also carries role="alert".
function appAlert(page: Page) {
  return page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
}

async function signUp(page: Page, email: string, password = "password-123") {
  await page.goto(BASE_URL + "/login");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
}

async function completeOnboarding(
  page: Page,
  handle: string,
  displayName: string,
  options: { avatar?: boolean } = {},
) {
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel(/handle/i).fill(handle);
  await page.getByLabel(/display name/i).fill(displayName);
  if (options.avatar) {
    await page.getByLabel(/profile picture/i).setInputFiles(AVATAR_FIXTURE);
  }
  await page.getByRole("button", { name: /finish/i }).click();
}

test.beforeEach(async ({ request }) => {
  await request.delete(FIRESTORE_CLEAR);
  await request.delete(AUTH_CLEAR);
});

test.describe("auth and onboarding", () => {
  test("sign up, complete onboarding with avatar, land on home signed in", async ({
    page,
  }) => {
    await signUp(page, uniqueEmail());

    // First login forces onboarding.
    await completeOnboarding(page, "cinemaven", "Cine Maven", {
      avatar: true,
    });

    // Lands on home, signed in, with handle and avatar visible in nav.
    await expect(page).toHaveURL(BASE_URL + "/");
    const header = page.getByRole("banner");
    await expect(header.getByText("@cinemaven")).toBeVisible();
    await expect(
      header.getByRole("img", { name: /cine maven/i }),
    ).toBeVisible();
  });

  test("unauthenticated visitors are redirected from protected routes to login", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/onboarding");
    await expect(page).toHaveURL(/\/login/);
  });

  test("onboarding blocks a taken handle with an inline error", async ({
    page,
  }) => {
    await signUp(page, uniqueEmail());
    await completeOnboarding(page, "firstowner", "First Owner");
    await expect(page).toHaveURL(BASE_URL + "/");
    await page.getByRole("button", { name: /sign out/i }).click();

    await signUp(page, uniqueEmail());
    await completeOnboarding(page, "firstowner", "Second User");

    // Stays on onboarding and explains the conflict.
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(appAlert(page)).toContainText(/already taken/i);

    // Picking a free handle recovers.
    await page.getByLabel(/handle/i).fill("secondowner");
    await page.getByRole("button", { name: /finish/i }).click();
    await expect(page).toHaveURL(BASE_URL + "/");
    await expect(
      page.getByRole("banner").getByText("@secondowner"),
    ).toBeVisible();
  });

  test("existing users can log out and log back in without onboarding again", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await signUp(page, email);
    await completeOnboarding(page, "returning", "Returning User");
    await expect(page).toHaveURL(BASE_URL + "/");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(
      page.getByRole("banner").getByRole("link", { name: /log in/i }),
    ).toBeVisible();

    await page.goto(BASE_URL + "/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill("password-123");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(BASE_URL + "/");
    await expect(page.getByRole("banner").getByText("@returning")).toBeVisible();
  });

  test("login shows an inline error for wrong credentials", async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, email);
    await completeOnboarding(page, "wrongpass", "Wrong Pass");
    await page.getByRole("button", { name: /sign out/i }).click();

    await page.goto(BASE_URL + "/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill("not-the-password");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(appAlert(page)).toContainText(/didn't match/i);
    await expect(page).toHaveURL(/\/login/);
  });
});
