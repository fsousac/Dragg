import { test, expect } from "@playwright/test";

test("creates a credit card payment method and a subscription", async ({
  page,
}) => {
  const methodName = `E2E Card ${Date.now()}`;
  const subscriptionName = `E2E Subscription ${Date.now()}`;

  await page.goto("/payments");

  // Payment method
  await page.getByRole("button", { name: "Add payment method" }).click();
  const methodDialog = page.getByRole("dialog");
  await methodDialog.locator("#new-payment-method-name").fill(methodName);
  await methodDialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Credit card", exact: true }).click();
  await methodDialog
    .locator("#new-payment-method-limit")
    .pressSequentially("500000");
  await methodDialog
    .getByRole("button", { name: "Add payment method" })
    .click();

  await expect(
    page.getByText("Payment method created successfully."),
  ).toBeVisible();
  await expect(page.getByText(methodName, { exact: true })).toBeVisible();

  // Subscription
  await page.getByRole("tab", { name: "Active Subscriptions" }).click();
  await page.getByRole("button", { name: "Add Subscription" }).click();
  const subscriptionDialog = page.getByRole("dialog");
  await subscriptionDialog
    .locator("#subscription-name")
    .fill(subscriptionName);
  await subscriptionDialog
    .locator("#subscription-amount")
    .pressSequentially("2990");
  await subscriptionDialog
    .getByRole("button", { name: "Add Subscription" })
    .click();

  await expect(
    page.getByText("Subscription scheduled successfully."),
  ).toBeVisible();
  await expect(
    page.getByText(subscriptionName, { exact: true }).first(),
  ).toBeVisible();
});
