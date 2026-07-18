import { test, expect } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the sign-in card by default", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  });

  test("requires accepting the Terms of Use and Privacy Policy before sign up", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("link", { name: "Terms of Use" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/fsousac/Dragg/blob/main/docs/terms-of-use.md",
    );
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/fsousac/Dragg/blob/main/docs/privacy-policy.md",
    );

    await page.getByLabel("First Name").fill("Test");
    await page.getByLabel("Last Name").fill("User");
    await page.getByLabel("Email", { exact: true }).fill("no-terms@example.com");
    await page.locator("#auth-password").fill("Secure1!x");
    await page.locator("#auth-confirm-password").fill("Secure1!x");

    await page.getByRole("button", { name: "Sign up with email" }).click();

    await expect(
      page.getByText(
        "You must accept the Terms of Use and Privacy Policy to create an account.",
      ),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});

test.describe("landing page locale detection", () => {
  test.use({ locale: "pt-BR" });

  test("renders Portuguese copy when the browser locale is pt-BR", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText("Finanças pessoais, open source e gratuito."),
    ).toBeVisible();
  });
});

test.describe("landing page theme detection", () => {
  test.use({ colorScheme: "dark" });

  test("applies dark mode when the system prefers dark", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("landing page theme detection (light)", () => {
  test.use({ colorScheme: "light" });

  test("applies light mode when the system prefers light", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});
