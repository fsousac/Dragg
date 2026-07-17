import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { NewPaymentMethodDialog } from "@/components/dashboard/new-payment-method-dialog";
import { toast } from "sonner";

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const translations: Record<string, string> = {
  "common.name": "Name",
  "common.cancel": "Cancel",
  "screen.payments.newPayment": "New payment method",
  "paymentMethod.createDescription": "Create a new payment method",
  "paymentMethod.namePlaceholder": "e.g. Main card",
  "paymentMethod.type": "Type",
  "paymentMethod.creditLimit": "Credit limit",
  "paymentMethod.createValidationError": "Name is required",
  "paymentMethod.createSuccess": "Payment method created",
  "paymentMethod.createError": "Could not create payment method",
  "paymentMethod.saving": "Saving...",
  "paymentMethod.create": "Create",
  "payments.closingDay": "Closing day",
  "payments.dueDay": "Due day",
  // Deliberately empty so the `t(...) || pt` fallback branch is exercised.
  "transaction.paymentMethods.debit": "",
};

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => translations[key] ?? key,
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value,
    formatNumber: (value: number) => String(value),
    locale: "en",
  }),
}));

async function selectType(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox"));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByText(label));
}

describe("NewPaymentMethodDialog", () => {
  it("renders closed with a children trigger and opens on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(
      <NewPaymentMethodDialog createPaymentMethodAction={vi.fn()}>
        <button>Add payment method</button>
      </NewPaymentMethodDialog>,
    );

    expect(screen.queryByText("New payment method")).not.toBeInTheDocument();

    await user.click(screen.getByText("Add payment method"));

    expect(screen.getByText("New payment method")).toBeInTheDocument();
    expect(screen.getByText("Create a new payment method")).toBeInTheDocument();
  });

  it("renders open via the controlled open prop with no trigger", () => {
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={vi.fn()}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("New payment method")).toBeInTheDocument();
  });

  it("shows credit-only fields when type is credit and hides them otherwise", async () => {
    const user = userEvent.setup();
    render(
      <NewPaymentMethodDialog createPaymentMethodAction={vi.fn()} open onOpenChange={vi.fn()} />,
    );

    expect(screen.queryByText("Credit limit")).not.toBeInTheDocument();
    expect(screen.queryByText("Closing day")).not.toBeInTheDocument();
    expect(screen.queryByText("Due day")).not.toBeInTheDocument();

    await selectType(user, "transaction.paymentMethods.credit");

    expect(screen.getByText("Credit limit")).toBeInTheDocument();
    expect(screen.getByText("Closing day")).toBeInTheDocument();
    expect(screen.getByText("Due day")).toBeInTheDocument();

    await selectType(user, "transaction.paymentMethods.bank");

    expect(screen.queryByText("Credit limit")).not.toBeInTheDocument();
    expect(screen.queryByText("Closing day")).not.toBeInTheDocument();
    expect(screen.queryByText("Due day")).not.toBeInTheDocument();
  });

  it("shows the validation error toast and skips the action when the name is empty", () => {
    const createPaymentMethodAction = vi.fn();
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Create"));

    expect(toast.error).toHaveBeenCalledWith("Name is required");
    expect(createPaymentMethodAction).not.toHaveBeenCalled();
  });

  it("shows the validation error toast for a whitespace-only name", () => {
    const createPaymentMethodAction = vi.fn();
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Create"));

    expect(toast.error).toHaveBeenCalledWith("Name is required");
    expect(createPaymentMethodAction).not.toHaveBeenCalled();
  });

  it("submits with undefined creditLimit/closingDay/dueDay when type is not credit", async () => {
    const createPaymentMethodAction = vi.fn().mockResolvedValue(undefined);
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        onCreated={onCreated}
        open
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Debit Card" },
    });
    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(createPaymentMethodAction).toHaveBeenCalledWith({
        name: "Debit Card",
        type: "debit",
        creditLimit: undefined,
        closingDay: undefined,
        dueDay: undefined,
      });
    });

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Payment method created");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).toHaveBeenCalled();
  });

  it("submits closingDay/dueDay as numbers when type is credit and both are filled", async () => {
    const user = userEvent.setup();
    const createPaymentMethodAction = vi.fn().mockResolvedValue(undefined);
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await selectType(user, "transaction.paymentMethods.credit");

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Credit Card" },
    });
    fireEvent.change(screen.getByPlaceholderText("7"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("14"), { target: { value: "20" } });

    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(createPaymentMethodAction).toHaveBeenCalledWith({
        name: "Credit Card",
        type: "credit",
        creditLimit: 0,
        closingDay: 5,
        dueDay: 20,
      });
    });
  });

  it("keeps closingDay/dueDay undefined when type is credit but they are left empty", async () => {
    const user = userEvent.setup();
    const createPaymentMethodAction = vi.fn().mockResolvedValue(undefined);
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await selectType(user, "transaction.paymentMethods.credit");

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Credit Card" },
    });

    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(createPaymentMethodAction).toHaveBeenCalledWith({
        name: "Credit Card",
        type: "credit",
        creditLimit: 0,
        closingDay: undefined,
        dueDay: undefined,
      });
    });
  });

  it("shows the saving state while the action is pending, then resets on success (no onCreated provided)", async () => {
    let resolveAction: () => void = () => {};
    const createPaymentMethodAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(
      <NewPaymentMethodDialog createPaymentMethodAction={createPaymentMethodAction} open />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Bank Account" },
    });
    fireEvent.click(screen.getByText("Create"));

    expect(await screen.findByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Saving...").closest("button")).toBeDisabled();
    expect(screen.getByText("Cancel").closest("button")).toBeDisabled();

    await act(async () => {
      resolveAction();
    });

    await vi.waitFor(() => {
      expect(screen.getByText("Create")).toBeInTheDocument();
    });
    expect(screen.getByText("Create").closest("button")).not.toBeDisabled();
  });

  it("shows an error toast, logs the error, and re-enables the submit button when the action rejects", async () => {
    const error = new Error("network down");
    const createPaymentMethodAction = vi.fn().mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={createPaymentMethodAction}
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Bank Account" },
    });
    fireEvent.click(screen.getByText("Create"));

    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error creating payment method:", error);
    });
    expect(toast.error).toHaveBeenCalledWith("Could not create payment method");

    await vi.waitFor(() => {
      expect(screen.getByText("Create").closest("button")).not.toBeDisabled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("closes the dialog when the cancel button is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <NewPaymentMethodDialog
        createPaymentMethodAction={vi.fn()}
        open
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(screen.getByText("Cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets all fields to their defaults each time the dialog re-opens", async () => {
    const user = userEvent.setup();
    render(
      <NewPaymentMethodDialog createPaymentMethodAction={vi.fn()}>
        <button>Add payment method</button>
      </NewPaymentMethodDialog>,
    );

    await user.click(screen.getByText("Add payment method"));

    fireEvent.change(screen.getByPlaceholderText("e.g. Main card"), {
      target: { value: "Leftover name" },
    });
    await selectType(user, "transaction.paymentMethods.credit");
    fireEvent.change(screen.getByPlaceholderText("7"), { target: { value: "9" } });
    fireEvent.change(screen.getByPlaceholderText("14"), { target: { value: "18" } });

    expect(screen.getByPlaceholderText("e.g. Main card")).toHaveValue("Leftover name");

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New payment method")).not.toBeInTheDocument();

    await user.click(screen.getByText("Add payment method"));

    expect(screen.getByPlaceholderText("e.g. Main card")).toHaveValue("");
    expect(screen.queryByText("Credit limit")).not.toBeInTheDocument();
    expect(screen.queryByText("Closing day")).not.toBeInTheDocument();
  });
});
