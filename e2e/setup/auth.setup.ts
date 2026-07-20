import { test as setup, expect } from "@playwright/test";

import { createTestUser } from "../fixtures/test-user";

const authFile = "e2e/.auth/user.json";

setup("sign up and save authenticated session", async ({ page }) => {
  const user = createTestUser();

  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByLabel("First Name").fill(user.firstName);
  await page.getByLabel("Last Name").fill(user.lastName);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.locator("#auth-confirm-password").fill(user.password);
  await page.locator("#auth-accept-terms").click();

  await page.getByRole("button", { name: "Sign up with email" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.context().storageState({ path: authFile });
});
