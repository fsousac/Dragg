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

  test("navigates through every sidebar section", async ({ page, isMobile }) => {
    // Mobile keeps these behind the bottom bar's "More" menu.
    const inMoreMenu = new Set(["Debts", "Categories", "Reports", "Goals", "Settings"]);
    const sections: Array<[name: string, path: string]> = [
      ["Transactions", "/transactions"],
      ["Categories", "/categories"],
      ["Budgets", "/budgets"],
      ["Payments", "/payments"],
      ["Debts", "/debts"],
      ["Reports", "/reports"],
      ["Goals", "/goals"],
      ["Settings", "/settings"],
      ["Overview", "/dashboard"],
    ];

    for (const [name, path] of sections) {
      if (isMobile && inMoreMenu.has(name)) {
        await page.getByRole("button", { name: "More" }).click();
        await page.getByRole("menuitem", { name, exact: true }).click();
      } else {
        await page.getByRole("link", { name, exact: true }).click();
      }
      await page.waitForURL((url) => url.pathname === path);
      expect(new URL(page.url()).pathname).toBe(path);
    }
  });
});
