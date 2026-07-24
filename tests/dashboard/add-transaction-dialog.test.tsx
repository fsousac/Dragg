import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AddTransactionDialog } from "@/components/dashboard/add-transaction-dialog";
import {
  type TransactionFormCategory,
  type TransactionFormPaymentMethod,
} from "@/lib/finance/transactions";

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

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams("month=2026-07"),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const translations: Record<string, string> = {
  "transaction.addTitle": "Add transaction",
  "transaction.addDescription": "Record a new transaction",
  "transaction.descriptionPlaceholder": "e.g. Groceries",
  "transaction.recordSuccess": "Transaction saved",
  "transaction.recordError": "Could not save transaction",
  "data.category.rent": "Rent",
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

const categories: TransactionFormCategory[] = [
  {
    group: "needs",
    id: "cat-needs",
    icon: "🏠",
    label: "data.category.rent",
    monthlyLimit: 1000,
  },
];

const paymentMethods: TransactionFormPaymentMethod[] = [
  { id: "pm-debit", label: "pm.debit", type: "debit" },
];

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
    target: { value: "Groceries" },
  });
  fireEvent.change(screen.getByPlaceholderText("0,00"), {
    target: { value: "10000" },
  });
}

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
});

describe("AddTransactionDialog", () => {
  it("renders nothing dialog-visible when closed", () => {
    render(
      <AddTransactionDialog
        open={false}
        onOpenChange={vi.fn()}
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.queryByText("Add transaction")).not.toBeInTheDocument();
  });

  it("awaits the parent onSubmit and then closes the dialog via onOpenChange(false)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <AddTransactionDialog
        open
        onOpenChange={onOpenChange}
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Add transaction")).toBeInTheDocument();

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

    const onSubmitOrder = onSubmit.mock.invocationCallOrder[0];
    const onOpenChangeOrder = onOpenChange.mock.invocationCallOrder[0];
    expect(onSubmitOrder).toBeLessThan(onOpenChangeOrder);
  });

  it("does not close the dialog when the parent onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    const onOpenChange = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AddTransactionDialog
        open
        onOpenChange={onOpenChange}
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmit={onSubmit}
      />,
    );

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    consoleErrorSpy.mockRestore();
  });
});
