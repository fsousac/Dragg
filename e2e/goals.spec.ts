import { test, expect } from "@playwright/test";

test("creates a goal, adds funds, and deletes it", async ({ page }) => {
  const goalName = `E2E Goal ${Date.now()}`;

  await page.goto("/goals");

  // Create
  await page.getByRole("button", { name: "New Goal" }).first().click();
  const createDialog = page.getByRole("dialog");
  await createDialog.locator("#goal-name").fill(goalName);
  await createDialog.locator("#goal-target").pressSequentially("100000");
  await createDialog.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByText("Goal created successfully.")).toBeVisible();

  const card = page.locator('[data-slot="card"]').filter({ hasText: goalName });
  await expect(card).toBeVisible();

  // Add funds
  await card.getByRole("button", { name: "Add funds" }).click();
  const fundDialog = page.getByRole("dialog");
  await fundDialog.locator("#goal-fund-amount").pressSequentially("5000");
  await fundDialog.getByRole("button", { name: "Add funds" }).click();

  await expect(page.getByText("Funds added successfully.")).toBeVisible();

  // Delete
  await card
    .getByRole("button")
    .filter({ has: page.locator("svg.lucide-ellipsis-vertical") })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();

  await expect(page.getByText("Goal deleted successfully.")).toBeVisible();
  await expect(page.locator('[data-slot="card"]').filter({ hasText: goalName })).toHaveCount(0);
});
