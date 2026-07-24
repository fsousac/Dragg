import { test, expect } from "@playwright/test";

import { createTestUser } from "./fixtures/test-user";

test("signs up, signs out is not required, then signs back in with the same credentials", async ({
  page,
}) => {
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

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.locator("#auth-password").fill(user.password);
  await page.getByRole("button", { name: "Sign in with email" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test("shows an error for invalid sign-in credentials", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Email", { exact: true }).fill("no-such-user@example.com");
  await page.locator("#auth-password").fill("WrongPassword1!");
  await page.getByRole("button", { name: "Sign in with email" }).click();

  await expect(
    page.getByText("Email or password is incorrect."),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/dashboard/);
});
