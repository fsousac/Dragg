import { test, expect, type Locator, type Page } from "@playwright/test";

// Seeds the E2E user through the app itself (income + saved total), then
// exercises issue #63: savings-funded expenses, financed purchases and loans.
// Desktop and mobile projects share one user, so every amount leaves room
// for the other project running in parallel.

async function openNewTransaction(page: Page) {
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Add Transaction" }).click();
  return page.getByRole("dialog");
}

async function saveTransaction(page: Page, dialog: Locator) {
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByText("Transaction recorded successfully!")).toBeVisible();
}

async function recordPlain(
  page: Page,
  type: "Income" | "Save",
  cents: string,
  description: string,
) {
  const dialog = await openNewTransaction(page);
  await dialog.getByRole("button", { name: type, exact: true }).click();
  await dialog.locator("#amount").pressSequentially(cents);
  await dialog.locator("#description").fill(description);
  await dialog.getByRole("button", { name: "Cash", exact: true }).click();
  await saveTransaction(page, dialog);
}

async function startFinancedExpense(page: Page, cents: string, description: string) {
  const dialog = await openNewTransaction(page);
  await dialog.locator("#amount").pressSequentially(cents);
  await dialog.getByRole("button", { name: /Food/ }).click();
  await dialog.locator("#description").fill(description);
  await dialog.getByRole("button", { name: "Cash", exact: true }).click();
  await dialog.getByRole("switch", { name: "Advanced options" }).click();
  await dialog.getByRole("switch", { name: "With interest / financing" }).click();
  return dialog;
}

async function pickInstallments(page: Page, dialog: Locator, count: string) {
  await dialog.getByRole("combobox").click();
  await page.getByRole("listbox").getByText(count, { exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  const seed = Date.now();
  await recordPlain(page, "Income", "500000", `E2E salary ${seed}`);
  await recordPlain(page, "Save", "200000", `E2E reserve ${seed}`);
});

test("pays an expense from the saved total", async ({ page }) => {
  const description = `E2E from savings ${Date.now()}`;
  const dialog = await openNewTransaction(page);
  await dialog.locator("#amount").pressSequentially("15000");
  await dialog.getByRole("button", { name: /Food/ }).click();
  await dialog.locator("#description").fill(description);
  await dialog.getByRole("button", { name: "Cash", exact: true }).click();
  await dialog.getByRole("switch", { name: "Advanced options" }).click();
  await dialog.getByRole("radio", { name: "Savings", exact: true }).click();
  await expect(dialog.getByText(/Available to use/)).toBeVisible();
  await saveTransaction(page, dialog);

  await expect(page.getByText(description, { exact: true })).toBeVisible();
});

test("records a financed purchase and shows its breakdown", async ({ page }) => {
  const description = `E2E notebook ${Date.now()}`;
  const dialog = await startFinancedExpense(page, "120000", description);
  await dialog.getByLabel("Interest rate (%)").fill("2");
  await pickInstallments(page, dialog, "12x");

  // Live preview: Price at 2% p.m. over 12x on 1,200.00.
  await expect(dialog.getByText("First installment")).toBeVisible();
  await expect(dialog.getByText("$113.47").first()).toBeVisible();
  await saveTransaction(page, dialog);

  await page.getByText(`${description} (1/12)`, { exact: true }).click();
  const details = page.getByRole("dialog");
  await expect(details.getByRole("heading", { name: "Financing" })).toBeVisible();
  await expect(details.getByText("Amortization", { exact: true })).toBeVisible();
  await expect(details.getByRole("row")).toHaveCount(13);
});

test("records a loan with the income on the operation date", async ({ page }) => {
  const description = `E2E loan ${Date.now()}`;
  const dialog = await startFinancedExpense(page, "100000", description);
  await dialog.getByRole("radio", { name: "Loan" }).click();
  await dialog.getByRole("button", { name: "Don't know the rate? Enter the installment amount" }).click();
  await dialog.locator("#financing-installment").pressSequentially("18000");
  await pickInstallments(page, dialog, "6x");
  await expect(dialog.getByText("Implied rate")).toBeVisible();
  await saveTransaction(page, dialog);

  // The loan income keeps the plain description; installments start next month.
  await expect(page.getByText(description, { exact: true })).toBeVisible();
});

test("splits every installment between balance and savings with the slider", async ({ page }) => {
  const description = `E2E split ${Date.now()}`;
  const dialog = await startFinancedExpense(page, "30000", description);
  await dialog.getByLabel("Interest rate (%)").fill("2");
  await pickInstallments(page, dialog, "3x");
  await dialog.getByRole("radio", { name: "Balance + savings" }).click();

  // Price at 2% p.m. over 3x on 300.00 → 104.03 per installment.
  const slider = dialog.getByRole("slider", { name: "How much comes from savings" });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(dialog.getByText("$104.03 per installment")).toBeVisible();
  await expect(dialog.getByText("$0.00 per installment")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(dialog.getByText("$104.03 per installment")).toBeVisible();
  await expect(dialog.getByText("$0.00 per installment")).toBeVisible();
  await saveTransaction(page, dialog);

  await expect(page.getByText(`${description} (1/3)`, { exact: true })).toBeVisible();
});

test("keeps the advanced options inside the dialog width", async ({ page }) => {
  const dialog = await startFinancedExpense(page, "30000", `E2E layout ${Date.now()}`);
  await dialog.getByRole("radio", { name: "Balance + savings" }).click();

  const overflowing = await dialog.evaluate((root) =>
    [root, ...root.querySelectorAll('[role="radio"], label:not(.sr-only), input')]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.textContent || element.id),
  );
  expect(overflowing).toEqual([]);
});

test("turns a plain expense into a financed one from the edit dialog", async ({ page }) => {
  const description = `E2E convert ${Date.now()}`;
  const dialog = await openNewTransaction(page);
  await dialog.locator("#amount").pressSequentially("60000");
  await dialog.getByRole("button", { name: /Food/ }).click();
  await dialog.locator("#description").fill(description);
  await dialog.getByRole("button", { name: "Cash", exact: true }).click();
  await saveTransaction(page, dialog);

  await page.getByText(description, { exact: true }).click();
  const edit = page.getByRole("dialog");
  await edit.getByRole("switch", { name: "Advanced options" }).click();
  await edit.getByRole("switch", { name: "With interest / financing" }).click();
  await edit.getByLabel("Interest rate (%)").fill("2");
  await edit.locator("#transaction-installments").fill("3");
  await edit.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Transaction updated successfully.")).toBeVisible();
  await expect(page.getByText(`${description} (1/3)`, { exact: true })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toHaveCount(0);
});

test("edits a financed purchase as the whole operation", async ({ page }) => {
  const description = `E2E tv ${Date.now()}`;
  const dialog = await startFinancedExpense(page, "120000", description);
  await dialog.getByLabel("Interest rate (%)").fill("2");
  await pickInstallments(page, dialog, "12x");
  await saveTransaction(page, dialog);

  await page.getByText(`${description} (1/12)`, { exact: true }).click();
  const edit = page.getByRole("dialog");
  // Prefilled from the plan, not from the clicked installment.
  await expect(edit.locator("#transaction-amount")).toHaveValue("1.200,00");
  await expect(edit.locator("#transaction-description")).toHaveValue(description);
  await expect(edit.locator("#transaction-installments")).toHaveValue("12");
  await expect(edit.getByLabel("Interest rate (%)")).toHaveValue("2");

  await edit.locator("#transaction-description").fill(`${description} v2`);
  await edit.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Transaction updated successfully.")).toBeVisible();
  await expect(page.getByText(`${description} v2 (1/12)`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${description} (1/12)`, { exact: true })).toHaveCount(0);
});

test("keeps interest-free card installments outside the advanced options", async ({ page }) => {
  const description = `E2E headphones ${Date.now()}`;
  const dialog = await openNewTransaction(page);
  await dialog.locator("#amount").pressSequentially("30000");
  await dialog.getByRole("button", { name: /Food/ }).click();
  await dialog.locator("#description").fill(description);
  // Visible but locked until the payment method allows installments.
  await dialog.getByRole("button", { name: "Cash", exact: true }).click();
  await expect(dialog.getByRole("combobox")).toBeDisabled();
  await dialog.getByRole("button", { name: "Credit Card", exact: true }).click();
  await pickInstallments(page, dialog, "3x");
  await saveTransaction(page, dialog);

  await expect(page.getByText(`${description} (1/3)`, { exact: true })).toBeVisible();
});

test("tracks a financed purchase on the debts page", async ({ page }) => {
  const description = `E2E debt ${Date.now()}`;
  const dialog = await startFinancedExpense(page, "120000", description);
  await dialog.getByLabel("Interest rate (%)").fill("2");
  await pickInstallments(page, dialog, "12x");
  await saveTransaction(page, dialog);

  await page.goto("/debts");
  const card = page.locator("[data-slot=card]").filter({ hasText: description });
  // The first installment falls on the purchase date (today), so it counts as paid.
  await expect(card.getByText("1 of 12 installments paid")).toBeVisible();
  await expect(card.getByText("$113.47").first()).toBeVisible();
  await card.getByRole("button", { name: "View schedule" }).click();

  const schedule = page.getByRole("dialog");
  await expect(schedule.getByRole("heading", { name: description })).toBeVisible();
  await expect(schedule.getByRole("row")).toHaveCount(13);
});

test("starts a purchase with interest from the debts page", async ({ page }) => {
  await page.goto("/debts");
  await page.getByRole("button", { name: "New purchase with interest" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("switch", { name: "With interest / financing" })).toBeChecked();
});
