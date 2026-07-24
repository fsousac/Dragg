import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { NewCategoryDialog } from "@/components/dashboard/new-category-dialog";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: () => refresh() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const translations: Record<string, string> = {
  "category.createValidationError": "Name is required",
  "category.updateSuccess": "Category updated",
  "category.createSuccess": "Category created",
  "category.updateError": "Could not update category",
  "category.createError": "Could not create category",
  "screen.categories.editCategory": "Edit category",
  "screen.categories.newCategory": "New category",
  "category.editDescription": "Edit an existing category",
  "category.createDescription": "Create a new category",
  "common.category": "Category",
  "category.namePlaceholder": "e.g. Groceries",
  "category.icon": "Icon",
  "category.group": "Group",
  "data.group.needs": "Needs",
  "data.group.wants": "Wants",
  "data.group.savings": "Savings",
  "category.monthlyLimit": "Monthly limit",
  "common.cancel": "Cancel",
  "category.saving": "Saving...",
  "category.update": "Update",
  "category.create": "Create",
};

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value,
    formatNumber: (value: number) => String(value),
    locale: "en",
    t: (key: string) => translations[key] ?? key,
  }),
}));

import { toast } from "sonner";

describe("NewCategoryDialog", () => {
  it("renders a children trigger uncontrolled and opens the dialog on click", () => {
    render(
      <NewCategoryDialog createCategoryAction={vi.fn()}>
        <button type="button">Open dialog</button>
      </NewCategoryDialog>,
    );

    expect(screen.queryByText("New category")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Open dialog"));

    expect(screen.getByText("New category")).toBeInTheDocument();
    expect(screen.getByText("Create a new category")).toBeInTheDocument();
  });

  it("renders already open via the controlled open prop", () => {
    render(
      <NewCategoryDialog open createCategoryAction={vi.fn()} onOpenChange={vi.fn()} />,
    );

    expect(screen.getByText("New category")).toBeInTheDocument();
  });

  it("creates a category, shows a success toast, resets, closes, and refreshes", async () => {
    let resolveCreate: () => void;
    const createCategoryAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const onCreated = vi.fn();

    render(
      <NewCategoryDialog
        createCategoryAction={createCategoryAction}
        onCreated={onCreated}
      >
        <button type="button">Open dialog</button>
      </NewCategoryDialog>,
    );

    fireEvent.click(screen.getByText("Open dialog"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
      target: { value: "Groceries" },
    });

    fireEvent.click(screen.getByText("Create"));

    expect(await screen.findByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...").closest("button")).toBeDisabled();
    expect(screen.getByText("Cancel")).toBeDisabled();

    expect(createCategoryAction).toHaveBeenCalledWith({
      group: "needs",
      icon: "🏷️",
      monthlyLimit: 0,
      name: "Groceries",
    });

    resolveCreate!();

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Category created");
    });
    await vi.waitFor(() => {
      expect(onCreated).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(screen.queryByText("New category")).not.toBeInTheDocument();
    });
  });

  it("updates a category in edit mode with the edit copy and id in the payload", async () => {
    const updateCategoryAction = vi.fn().mockResolvedValue(undefined);
    const category = {
      group: "wants" as const,
      icon: "🎮",
      id: "cat-1",
      monthlyLimit: 150,
      name: "Leisure",
    };

    render(
      <NewCategoryDialog
        open
        category={category}
        createCategoryAction={vi.fn()}
        updateCategoryAction={updateCategoryAction}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Edit category")).toBeInTheDocument();
    expect(screen.getByText("Edit an existing category")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Update"));

    await vi.waitFor(() => {
      expect(updateCategoryAction).toHaveBeenCalledWith({
        group: "wants",
        icon: "🎮",
        monthlyLimit: 150,
        name: "Leisure",
        id: "cat-1",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Category updated");
  });

  it("starts with an empty name field when category.showName is false, even though category.name is set", () => {
    render(
      <NewCategoryDialog
        open
        category={{
          group: "needs",
          icon: "🏠",
          id: "cat-2",
          monthlyLimit: 0,
          name: "Housing",
          showName: false,
        }}
        createCategoryAction={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByPlaceholderText("e.g. Groceries") as HTMLInputElement).value,
    ).toBe("");
  });

  it("shows a validation error toast and does not call the create action when the name is empty", () => {
    const createCategoryAction = vi.fn();
    render(
      <NewCategoryDialog open createCategoryAction={createCategoryAction} onOpenChange={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("Create"));

    expect(toast.error).toHaveBeenCalledWith("Name is required");
    expect(createCategoryAction).not.toHaveBeenCalled();
  });

  it("shows a validation error when the name is whitespace-only and there is no category name fallback", () => {
    const createCategoryAction = vi.fn();
    render(
      <NewCategoryDialog open createCategoryAction={createCategoryAction} onOpenChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Create"));

    expect(toast.error).toHaveBeenCalledWith("Name is required");
    expect(createCategoryAction).not.toHaveBeenCalled();
  });

  it("falls back to category.name when the name field is cleared to whitespace before submit", async () => {
    const updateCategoryAction = vi.fn().mockResolvedValue(undefined);
    render(
      <NewCategoryDialog
        open
        category={{
          group: "savings",
          icon: "📈",
          id: "cat-3",
          monthlyLimit: 200,
          name: "Investments",
        }}
        createCategoryAction={vi.fn()}
        updateCategoryAction={updateCategoryAction}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Update"));

    await vi.waitFor(() => {
      expect(updateCategoryAction).toHaveBeenCalledWith({
        group: "savings",
        icon: "📈",
        monthlyLimit: 200,
        name: "Investments",
        id: "cat-3",
      });
    });
  });

  it("resets the name back to empty after a successful update when category.showName is false", async () => {
    const updateCategoryAction = vi.fn().mockResolvedValue(undefined);

    render(
      <NewCategoryDialog
        open
        category={{
          group: "needs",
          icon: "🏠",
          id: "cat-5",
          monthlyLimit: 0,
          name: "Housing",
          showName: false,
        }}
        createCategoryAction={vi.fn()}
        updateCategoryAction={updateCategoryAction}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByPlaceholderText("e.g. Groceries") as HTMLInputElement).value,
    ).toBe("");

    fireEvent.click(screen.getByText("Update"));

    await vi.waitFor(() => {
      expect(updateCategoryAction).toHaveBeenCalledWith({
        group: "needs",
        icon: "🏠",
        monthlyLimit: 0,
        name: "Housing",
        id: "cat-5",
      });
    });
  });

  it("logs and shows an error toast when createCategoryAction rejects, then re-enables the form", async () => {
    const error = new Error("network down");
    const createCategoryAction = vi.fn().mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <NewCategoryDialog open createCategoryAction={createCategoryAction} onOpenChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
      target: { value: "Groceries" },
    });
    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving category:", error);
    });
    expect(toast.error).toHaveBeenCalledWith("Could not create category");
    await vi.waitFor(() => {
      expect(screen.getByText("Create").closest("button")).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("logs and shows an error toast when updateCategoryAction rejects", async () => {
    const error = new Error("update failed");
    const updateCategoryAction = vi.fn().mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <NewCategoryDialog
        open
        category={{
          group: "needs",
          icon: "🏠",
          id: "cat-4",
          monthlyLimit: 0,
          name: "Housing",
        }}
        createCategoryAction={vi.fn()}
        updateCategoryAction={updateCategoryAction}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Update"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving category:", error);
    });
    expect(toast.error).toHaveBeenCalledWith("Could not update category");

    consoleErrorSpy.mockRestore();
  });

  it("toggles the selected emoji when a different one is clicked", () => {
    render(
      <NewCategoryDialog open createCategoryAction={vi.fn()} onOpenChange={vi.fn()} />,
    );

    const defaultButton = screen.getByLabelText("Outros");
    const groceriesButton = screen.getByLabelText("Mercado");

    expect(defaultButton).toHaveAttribute("aria-pressed", "true");
    expect(groceriesButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(groceriesButton);

    expect(groceriesButton).toHaveAttribute("aria-pressed", "true");
    expect(groceriesButton.className).toContain("border-primary");
    expect(defaultButton).toHaveAttribute("aria-pressed", "false");
    expect(defaultButton.className).toContain("border-border");
  });

  it("changes the group via the select dropdown", async () => {
    const user = userEvent.setup();
    const createCategoryAction = vi.fn().mockResolvedValue(undefined);

    render(
      <NewCategoryDialog open createCategoryAction={createCategoryAction} onOpenChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Savings"));

    fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
      target: { value: "Emergency fund" },
    });
    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(createCategoryAction).toHaveBeenCalledWith(
        expect.objectContaining({ group: "savings" }),
      );
    });
  });

  it("calls onOpenChange(false) when the cancel button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <NewCategoryDialog
        open
        createCategoryAction={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes an uncontrolled dialog when cancel is clicked", () => {
    render(
      <NewCategoryDialog createCategoryAction={vi.fn()}>
        <button type="button">Open dialog</button>
      </NewCategoryDialog>,
    );

    fireEvent.click(screen.getByText("Open dialog"));
    expect(screen.getByText("New category")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("New category")).not.toBeInTheDocument();
  });

  it("resyncs form state from a new category whenever open or category changes", () => {
    const categoryA = {
      group: "needs" as const,
      icon: "🏠",
      id: "cat-a",
      monthlyLimit: 100,
      name: "Rent",
    };
    const categoryB = {
      group: "wants" as const,
      icon: "🎮",
      id: "cat-b",
      monthlyLimit: 50,
      name: "Games",
    };

    const { rerender } = render(
      <NewCategoryDialog
        open={false}
        category={categoryA}
        createCategoryAction={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Edit category")).not.toBeInTheDocument();

    rerender(
      <NewCategoryDialog
        open
        category={categoryA}
        createCategoryAction={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByPlaceholderText("e.g. Groceries") as HTMLInputElement).value,
    ).toBe("Rent");

    rerender(
      <NewCategoryDialog
        open
        category={categoryB}
        createCategoryAction={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByPlaceholderText("e.g. Groceries") as HTMLInputElement).value,
    ).toBe("Games");
  });
});
