import { expect, type Page } from "@playwright/test";
import path from "node:path";

export const BASE_URL = process.env.PW_BASE_URL ?? "http://localhost:3100";

export const FIRESTORE_CLEAR =
  "http://127.0.0.1:8080/emulator/v1/projects/demo-mediapage/databases/(default)/documents";
export const AUTH_CLEAR =
  "http://127.0.0.1:9099/emulator/v1/projects/demo-mediapage/accounts";

export const AVATAR_FIXTURE = path.join(__dirname, "..", "fixtures", "avatar.png");

let userCounter = 0;
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${userCounter++}@example.com`;
}

// Our inline error alerts; excludes Next.js's route announcer,
// which also carries role="alert".
export function appAlert(page: Page) {
  return page.locator('[role="alert"]:not([id="__next-route-announcer__"])');
}

export async function signUp(
  page: Page,
  email: string,
  password = "password-123",
) {
  await page.goto(BASE_URL + "/login");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
}

export async function completeOnboarding(
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

export async function signUpAndOnboard(
  page: Page,
  handle: string,
  displayName: string,
): Promise<string> {
  const email = uniqueEmail();
  await signUp(page, email);
  await completeOnboarding(page, handle, displayName);
  await expect(page).toHaveURL(BASE_URL + "/");
  return email;
}

// Posts a recommendation through the library detail dialog using the
// anime fixtures ("Mononoke Hour N"), which live under the Shows shelf.
export async function postRecommendationViaDialog(
  page: Page,
  fixtureNumber: number,
  note: string,
  options: { allowComments?: boolean } = {},
) {
  await page.goto(BASE_URL + "/library");
  await page.getByLabel(/search the library/i).fill("mononoke");
  await page.getByRole("radio", { name: /shows/i }).check();
  await page
    .getByRole("button", { name: new RegExp(`Mononoke Hour ${fixtureNumber}$`) })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^recommend/i }).click();
  await dialog.getByLabel(/why this one/i).fill(note);
  if (options.allowComments) {
    await dialog.getByLabel(/allow comments/i).check();
  }
  await dialog.getByRole("button", { name: /post recommendation/i }).click();
  await expect(dialog.getByText(/recommendation posted/i)).toBeVisible();
  await dialog.getByRole("button", { name: /close/i }).click();
}
