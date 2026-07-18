import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  TransactionForm,
  type TransactionFormData,
} from "@/components/dashboard/transaction-form";
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
  "common.required": "Required",
  "transaction.typeExpense": "Expense",
  "transaction.typeIncome": "Income",
  "transaction.typeSaving": "Saving",
  "transaction.amount": "Amount",
  "transaction.category": "Category",
  "transaction.addCategory": "Add category",
  "transaction.description": "Description",
  "transaction.descriptionPlaceholder": "e.g. Groceries",
  "transaction.paymentMethod": "Payment method",
  "transaction.addPaymentMethod": "Add payment method",
  "transaction.date": "Date",
  "transaction.installmentFrequency": "Installments",
  "transaction.installmentOption.full": "Full payment",
  "transaction.notes": "Notes",
  "transaction.notesPlaceholder": "Add a note",
  "transaction.saving": "Saving...",
  "transaction.save": "Save",
  "transaction.recordSuccess": "Transaction saved",
  "transaction.recordError": "Could not save transaction",
  "data.category.rent": "Rent",
  "data.category.entertainment": "Entertainment",
  "data.category.investments": "Investments",
  "data.category.receipts": "Receipts",
  "pm.debit": "Debit Card",
  "pm.credit": "Credit Card",
  "pm.boleto": "Boleto",
  "pm.storeBoleto": "Store Boleto Plan",
  "screen.categories.newCategory": "New category",
  "category.createDescription": "Create a new category",
  "screen.payments.newPayment": "New payment method",
  "paymentMethod.createDescription": "Create a new payment method",
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
  {
    group: "wants",
    id: "cat-wants",
    icon: "🎬",
    label: "data.category.entertainment",
    monthlyLimit: 300,
  },
  {
    group: "savings",
    id: "cat-savings",
    icon: "💰",
    label: "data.category.investments",
    monthlyLimit: 500,
  },
  {
    group: "income",
    id: "cat-income",
    icon: "💵",
    label: "data.category.receipts",
    monthlyLimit: 0,
  },
];

const categoriesNoSavings = categories.filter((c) => c.group !== "savings");

const paymentMethods: TransactionFormPaymentMethod[] = [
  { id: "pm-debit", label: "pm.debit", type: "debit" },
  { id: "pm-credit", label: "pm.credit", type: "credit" },
];

const paymentMethodsAllTypes: TransactionFormPaymentMethod[] = [
  { id: "pm-debit", label: "pm.debit", type: "debit" },
  { id: "pm-credit", label: "pm.credit", type: "credit" },
  { id: "pm-boleto", label: "pm.boleto", type: "boleto" },
  { id: "pm-storeboleto", label: "pm.storeBoleto", type: "other" },
];

type FormProps = React.ComponentProps<typeof TransactionForm>;

function baseProps(overrides: Partial<FormProps> = {}): FormProps {
  return {
    categories,
    paymentMethods,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function fillRequiredFields(overrides?: { description?: string; amount?: string }) {
  fireEvent.change(screen.getByPlaceholderText("e.g. Groceries"), {
    target: { value: overrides?.description ?? "Groceries" },
  });
  fireEvent.change(screen.getByPlaceholderText("0,00"), {
    target: { value: overrides?.amount ?? "10000" },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /Save/ }));
}

beforeEach(() => {
  pushMock.mockClear();
  refreshMock.mockClear();
});

describe("TransactionForm rendering", () => {
  it("renders expense category chips (excluding income/savings) and both payment methods by default", () => {
    render(<TransactionForm {...baseProps()} />);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
    expect(screen.queryByText("Investments")).not.toBeInTheDocument();
    expect(screen.queryByText("Receipts")).not.toBeInTheDocument();

    expect(screen.getByText("Debit Card")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Add category")).toBeInTheDocument();
    expect(screen.getByText("Add payment method")).toBeInTheDocument();
  });
});

describe("TransactionForm type tabs", () => {
  it("shows the synthetic income chip only, and the savings chip when switching to saving", () => {
    render(<TransactionForm {...baseProps()} />);

    fireEvent.click(screen.getByText("Income"));
    expect(screen.getByText("Receipts")).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(screen.queryByText("Entertainment")).not.toBeInTheDocument();
    expect(screen.queryByText("Investments")).not.toBeInTheDocument();
    expect(screen.queryByText("Add category")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Saving"));
    expect(screen.getByText("Investments")).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(screen.queryByText("Receipts")).not.toBeInTheDocument();
    expect(screen.queryByText("Add category")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Expense"));
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
    expect(screen.getByText("Add category")).toBeInTheDocument();
  });

  it("falls back to all expense categories for saving type when there are no savings categories", () => {
    render(<TransactionForm {...baseProps({ categories: categoriesNoSavings })} />);

    fireEvent.click(screen.getByText("Saving"));
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("selecting a category chip marks it selected", () => {
    render(<TransactionForm {...baseProps()} />);

    fireEvent.click(screen.getByText("Entertainment"));
    expect(screen.getByText("Entertainment").closest("button")).toHaveClass(
      "bg-yellow-400/15",
    );
  });

  it("falls back to the default chip style for a category whose group is unrecognized", () => {
    const categoriesWithUnknownGroup: TransactionFormCategory[] = [
      ...categories,
      {
        group: "other" as TransactionFormCategory["group"],
        id: "cat-other",
        icon: "❓",
        label: "data.category.other-thing",
        monthlyLimit: 0,
      },
    ];

    render(
      <TransactionForm {...baseProps({ categories: categoriesWithUnknownGroup })} />,
    );

    fireEvent.click(screen.getByText("data.category.other-thing"));
    expect(
      screen.getByText("data.category.other-thing").closest("button"),
    ).toHaveClass("border-foreground/30");
  });

  it("keeps a still-valid savings category on a categories prop change, and falls back once it becomes invalid while on saving type", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<TransactionForm {...baseProps({ onSubmit })} />);

    fireEvent.click(screen.getByText("Saving"));
    expect(screen.getByText("Investments").closest("button")).toHaveClass(
      "border-green-500/40",
    );

    // New (but equivalent) categories reference forces the sync effect to
    // re-run while still on "saving" and the selected category is still
    // valid -> exercises the "keep current category" branch.
    rerender(
      <TransactionForm {...baseProps({ onSubmit, categories: [...categories] })} />,
    );
    expect(screen.getByText("Investments").closest("button")).toHaveClass(
      "border-green-500/40",
    );

    // Now the savings category disappears entirely while still on "saving"
    // -> exercises the fallback branch, resetting to the first expense
    // category.
    rerender(
      <TransactionForm
        {...baseProps({ onSubmit, categories: categoriesNoSavings })}
      />,
    );
    expect(screen.getByText("Rent").closest("button")).toHaveClass(
      "border-blue-500/40",
    );

    fillRequiredFields();
    submit();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ category: "cat-needs" }),
    );
  });

  it("re-runs the sync effect while on income (keeps the income category) when categories/paymentMethods change reference", () => {
    const { rerender } = render(<TransactionForm {...baseProps()} />);

    fireEvent.click(screen.getByText("Income"));
    expect(screen.getByText("Receipts")).toBeInTheDocument();

    // A new categories/paymentMethods reference forces the sync effect to
    // re-run while still on "income" -> exercises the income branch inside
    // the effect (as opposed to the tab-click handler, which sets it directly).
    rerender(
      <TransactionForm
        {...baseProps({ categories: [...categories], paymentMethods: [...paymentMethods] })}
      />,
    );
    expect(screen.getByText("Receipts")).toBeInTheDocument();
  });

  it("falls back to the default expense category when switching from income straight back to expense", () => {
    render(<TransactionForm {...baseProps()} />);

    fireEvent.click(screen.getByText("Income"));
    fireEvent.click(screen.getByText("Expense"));

    expect(screen.getByText("Rent").closest("button")).toHaveClass(
      "border-blue-500/40",
    );
  });
});

describe("empty categories/payment methods edge case", () => {
  it("falls back to 'none' defaults everywhere and still submits successfully", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { toast } = await import("sonner");
    render(<TransactionForm {...baseProps({ onSubmit, categories: [], paymentMethods: [] })} />);

    fillRequiredFields();
    submit();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ category: "none", paymentMethod: "none" }),
    );
    expect(toast.success).toHaveBeenCalled();
  });
});

describe("handlePaymentMethodChange defensive fallback", () => {
  it("falls back gracefully when the clicked payment method id is no longer present in the current list", () => {
    const mutablePaymentMethods: TransactionFormPaymentMethod[] = [
      { id: "pm-debit", label: "pm.debit", type: "debit" },
      { id: "pm-credit", label: "pm.credit", type: "credit" },
    ];
    render(
      <TransactionForm {...baseProps({ paymentMethods: mutablePaymentMethods })} />,
    );

    const creditButton = screen.getByText("Credit Card").closest("button")!;

    // Mutate the very same array reference in place (simulating the payment
    // method having disappeared between render and click) so the component's
    // closure over `paymentMethods` no longer contains the clicked entry —
    // exercises handlePaymentMethodChange's "not found" fallback branch.
    mutablePaymentMethods.length = 1;

    fireEvent.click(creditButton);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("installment eligibility across payment method types", () => {
  it("shows the installment select for credit/boleto/label-contains-boleto methods and hides it for debit, resetting the count on non-installment methods", async () => {
    const user = userEvent.setup();
    render(<TransactionForm {...baseProps({ paymentMethods: paymentMethodsAllTypes })} />);

    // Default payment method is debit -> no installment select.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // Switch to credit -> select appears (type === "credit" branch).
    fireEvent.click(screen.getByText("Credit Card"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    // Bump installment count to 3x while on the credit method.
    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("3x"));
    expect(screen.getByRole("combobox")).toHaveTextContent("3x");

    // Re-selecting an installment-capable method preserves the count.
    fireEvent.click(screen.getByText("Boleto"));
    expect(screen.getByRole("combobox")).toHaveTextContent("3x");

    // Label-contains-"boleto" branch: type is "other" but label includes "boleto".
    fireEvent.click(screen.getByText("Store Boleto Plan"));
    expect(screen.getByRole("combobox")).toHaveTextContent("3x");

    // Switching to a non-installment method hides the select and resets the count.
    fireEvent.click(screen.getByText("Debit Card"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // Switching back to credit confirms the count was reset to 1 ("Full payment").
    fireEvent.click(screen.getByText("Credit Card"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Full payment");
  });

  it("hides the installment select outside of expense type even with a credit payment method", () => {
    render(<TransactionForm {...baseProps({ paymentMethods: paymentMethodsAllTypes })} />);

    fireEvent.click(screen.getByText("Credit Card"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Saving"));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("date field", () => {
  it("defaults to today's date, round-trips a valid typed date, and clears back to today on an invalid date", () => {
    const todayInputValue = new Date().toISOString().slice(0, 10);
    render(<TransactionForm {...baseProps()} />);

    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe(todayInputValue);

    fireEvent.change(dateInput, { target: { value: "2026-01-15" } });
    expect(dateInput.value).toBe("2026-01-15");

    fireEvent.change(dateInput, { target: { value: "2026-13-45" } });
    expect(dateInput.value).toBe(todayInputValue);
  });
});

describe("validation", () => {
  it("blocks submit and shows inline errors for empty description and zero amount", () => {
    const onSubmit = vi.fn();
    render(<TransactionForm {...baseProps({ onSubmit })} />);

    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(2);
  });

  it("shows a payment method error when the resolved payment method id is empty", () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm
        {...baseProps({
          onSubmit,
          paymentMethods: [{ id: "", label: "pm.debit", type: "debit" }],
        })}
      />,
    );

    fillRequiredFields();
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
  });

  it("shows a date error when the date field is cleared to an invalid value", () => {
    const onSubmit = vi.fn();
    render(<TransactionForm {...baseProps({ onSubmit })} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-13-45" },
    });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);
  });
});

describe("successful submission", () => {
  it("submits the expected payload, shows a success toast, resets the form, and refreshes the router", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { toast } = await import("sonner");
    render(<TransactionForm {...baseProps({ onSubmit })} />);

    fillRequiredFields({ description: "Groceries" });
    fireEvent.change(screen.getByPlaceholderText("Add a note"), {
      target: { value: "weekly run" },
    });

    submit();

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      type: "expense",
      date: expect.any(String),
      amount: 100,
      category: "cat-needs",
      paymentMethod: "pm-debit",
      installmentCount: 1,
      description: "Groceries",
      notes: "weekly run",
    } satisfies TransactionFormData);

    expect(toast.success).toHaveBeenCalledWith("Transaction saved");
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));

    await vi.waitFor(() => {
      expect(
        (screen.getByPlaceholderText("e.g. Groceries") as HTMLInputElement)
          .value,
      ).toBe("");
    });
    expect((screen.getByPlaceholderText("0,00") as HTMLInputElement).value).toBe(
      "",
    );
  });
});

describe("failed submission", () => {
  it("logs the error, shows an error toast, and resets the loading state", async () => {
    const error = new Error("network down");
    const onSubmit = vi.fn().mockRejectedValue(error);
    const { toast } = await import("sonner");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<TransactionForm {...baseProps({ onSubmit })} />);
    fillRequiredFields();
    submit();

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error submitting transaction:",
        error,
      );
    });
    expect(toast.error).toHaveBeenCalledWith("Could not save transaction");

    await vi.waitFor(() => {
      const button = screen.getByRole("button", { name: "Save" });
      expect(button).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });
});

describe("add category / add payment method chips", () => {
  it("opens the NewCategoryDialog and NewPaymentMethodDialog when create actions are provided", async () => {
    render(
      <TransactionForm
        {...baseProps({
          createCategoryAction: vi.fn().mockResolvedValue(undefined),
          createPaymentMethodAction: vi.fn().mockResolvedValue(undefined),
        })}
      />,
    );

    fireEvent.click(screen.getByText("Add category"));
    expect(await screen.findByText("New category")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Add payment method"));
    expect(await screen.findByText("New payment method")).toBeInTheDocument();
  });

  it("closes the new-payment-method dialog after a payment method is successfully created", async () => {
    const createPaymentMethodAction = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm {...baseProps({ createPaymentMethodAction })} />);

    fireEvent.click(screen.getByText("Add payment method"));
    await screen.findByText("New payment method");

    fireEvent.change(screen.getByPlaceholderText("paymentMethod.namePlaceholder"), {
      target: { value: "Cash Wallet" },
    });
    fireEvent.click(screen.getByText("paymentMethod.create"));

    await vi.waitFor(() => {
      expect(createPaymentMethodAction).toHaveBeenCalled();
    });
    await vi.waitFor(() => {
      expect(screen.queryByText("New payment method")).not.toBeInTheDocument();
    });
  });

  it("pushes to /categories and /payments (preserving the month) when create actions are not provided", () => {
    render(<TransactionForm {...baseProps()} />);

    fireEvent.click(screen.getByText("Add category"));
    expect(pushMock).toHaveBeenCalledWith("/categories?month=2026-07");

    fireEvent.click(screen.getByText("Add payment method"));
    expect(pushMock).toHaveBeenCalledWith("/payments?month=2026-07");
  });
});
