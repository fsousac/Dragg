import { test, expect } from "@playwright/test";

test("creates, edits, and deletes a transaction", async ({ page }) => {
  const description = `E2E groceries ${Date.now()}`;
  const updatedDescription = `${description} (updated)`;

  await page.goto("/transactions");

  // Create
  await page.getByRole("button", { name: "Add Transaction" }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.locator("#amount").pressSequentially("5000");
  await addDialog.getByRole("button", { name: /Food/ }).click();
  await addDialog.locator("#description").fill(description);
  await addDialog.getByRole("button", { name: "Cash", exact: true }).click();
  await addDialog.getByRole("button", { name: "Save transaction" }).click();

  await expect(page.getByText("Transaction recorded successfully!")).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();

  // Edit
  await page.getByText(description, { exact: true }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.locator("#transaction-description").fill(updatedDescription);
  await editDialog.getByRole("button", { name: "Save changes" }).click();

  await expect(
    page.getByText("Transaction updated successfully."),
  ).toBeVisible();
  await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();

  // Delete
  const rowButton = page.getByRole("button", { name: updatedDescription });
  await rowButton.locator("xpath=following-sibling::button[1]").click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();

  await expect(
    page.getByText("Transaction deleted successfully."),
  ).toBeVisible();
  await expect(page.getByText(updatedDescription, { exact: true })).toHaveCount(0);
});
