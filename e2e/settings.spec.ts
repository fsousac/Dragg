import { test, expect } from "@playwright/test";

test("toggles theme and persists it across reloads", async ({ page }) => {
  await page.goto("/settings");

  const html = page.locator("html");
  const wasDark = (await html.getAttribute("class"))?.includes("dark") ?? false;

  await page.getByRole("button", { name: "Toggle theme" }).first().click();

  if (wasDark) {
    await expect(html).not.toHaveClass(/dark/);
  } else {
    await expect(html).toHaveClass(/dark/);
  }

  await page.reload();

  if (wasDark) {
    await expect(html).not.toHaveClass(/dark/);
  } else {
    await expect(html).toHaveClass(/dark/);
  }
});

test("switches currency and language", async ({ page }) => {
  await page.goto("/settings");

  const comboboxes = page.getByRole("combobox");
  const currencySelect = comboboxes.nth(0);
  const languageSelect = comboboxes.nth(1);

  await currencySelect.click();
  await page.getByRole("option", { name: "EUR (€)" }).click();
  await expect(currencySelect).toHaveText(/EUR/);

  await languageSelect.click();
  await page.getByRole("option", { name: "Português" }).click();

  await expect(page.getByRole("link", { name: "Visão geral" })).toBeVisible();
});
