import { test, expect } from "@playwright/test";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders the summary cards", async ({ page }) => {
    await expect(page.getByText("Total Income")).toBeVisible();
    await expect(page.getByText("Total Expenses")).toBeVisible();
    await expect(page.getByText("Total Saved")).toBeVisible();
    await expect(page.getByText("Current Balance")).toBeVisible();
  });

  test("navigates through every sidebar section", async ({ page }) => {
    const sections: Array<[name: string, path: string]> = [
      ["Transactions", "/transactions"],
      ["Categories", "/categories"],
      ["Budgets", "/budgets"],
      ["Payments", "/payments"],
      ["Reports", "/reports"],
      ["Goals", "/goals"],
      ["Settings", "/settings"],
      ["Overview", "/dashboard"],
    ];

    for (const [name, path] of sections) {
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")));
    }
  });
});
