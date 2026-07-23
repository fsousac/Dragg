import { test, expect } from "@playwright/test";

test("creates a credit card payment method and uses it in a transaction", async ({
  page,
}) => {
  const cardName = `E2E Credit Card ${Date.now()}`;
  const description = `E2E credit card purchase ${Date.now()}`;

  // ponytail: closing/due day set to the last day of the current month so
  // today always falls inside this month's invoice cycle (getCreditCardInvoiceCycle
  // treats closingDay <= dueDay as "closes this month"), keeping the purchase
  // visible under the current month's transactions view regardless of what
  // day this suite runs on.
  const now = new Date();
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const cycleDay = String(lastDayOfMonth);

  await page.goto("/payments");
  await page.getByRole("button", { name: "Add payment method" }).click();

  const methodDialog = page.getByRole("dialog");
  await methodDialog.locator("#new-payment-method-name").fill(cardName);
  await methodDialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Credit card", exact: true }).click();
  await methodDialog
    .locator("#new-payment-method-limit")
    .pressSequentially("500000");
  await methodDialog
    .locator("#new-payment-method-closing-day")
    .fill(cycleDay);
  await methodDialog.locator("#new-payment-method-due-day").fill(cycleDay);
  await methodDialog
    .getByRole("button", { name: "Add payment method" })
    .click();

  await expect(
    page.getByText("Payment method created successfully."),
  ).toBeVisible();
  await expect(page.getByText(cardName, { exact: true })).toBeVisible();
  const cardEntry = page.getByRole("button", {
    name: `Payment details: ${cardName}`,
    exact: true,
  });
  await expect(cardEntry.getByText(/Limit:/)).toBeVisible();

  // Use the new credit card in a transaction
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Add Transaction" }).click();

  const txDialog = page.getByRole("dialog");
  await txDialog.locator("#amount").pressSequentially("15000");
  await txDialog.locator("#description").fill(description);
  await txDialog.getByRole("button", { name: cardName, exact: true }).click();

  await expect(
    txDialog.getByLabel("Installment", { exact: false }),
  ).toBeVisible();

  await txDialog.getByRole("button", { name: "Save transaction" }).click();

  await expect(page.getByText("Transaction recorded successfully!")).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
});
