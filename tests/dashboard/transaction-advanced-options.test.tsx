import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  advancedFromBreakdown,
  advancedFromSavings,
  buildTransactionSubmitData,
  DEFAULT_ADVANCED_OPTIONS,
  getFirstChargeFromBalance,
  TransactionAdvancedOptions,
  withGoal,
  type AdvancedOptionsState,
} from "@/components/dashboard/transaction-advanced-options";
import type { TransactionFormData } from "@/components/dashboard/transaction-form";

const { getFundingContextAction, getGoalOptionsAction } = vi.hoisted(() => ({
  getFundingContextAction: vi.fn().mockResolvedValue({ totalSaved: 800, availableBalance: 50 }),
  getGoalOptionsAction: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/app/transactions/actions", () => ({ getFundingContextAction, getGoalOptionsAction }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatNumber: (value: number) => value.toFixed(2),
    t: (key: string) => key,
  }),
}));

beforeAll(() => {
  // jsdom lacks the pointer APIs Radix Select relies on.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const formData: TransactionFormData = {
  type: "expense", date: "15/01/2030", amount: 1000, category: "c", paymentMethod: "p",
  installmentCount: 12, description: "Notebook", notes: "",
};
const withInterest: AdvancedOptionsState = {
  ...DEFAULT_ADVANCED_OPTIONS,
  enabled: true,
  interestEnabled: true,
  financing: { ...DEFAULT_ADVANCED_OPTIONS.financing, rate: 2 },
};

describe("buildTransactionSubmitData", () => {
  it("returns the form data untouched when advanced is off or the type is not expense", () => {
    expect(buildTransactionSubmitData(formData, DEFAULT_ADVANCED_OPTIONS)).toBe(formData);
    expect(buildTransactionSubmitData({ ...formData, type: "income" }, withInterest)).toEqual({ ...formData, type: "income" });
  });

  it("maps the funding mode to savingsFundedAmount using the current amount", () => {
    const savings = { ...DEFAULT_ADVANCED_OPTIONS, enabled: true, fundingMode: "savings" as const };
    expect(buildTransactionSubmitData({ ...formData, amount: 700 }, savings).savingsFundedAmount).toBe(700);
    const split = { ...savings, fundingMode: "split" as const, savingsShare: 0.25 };
    expect(buildTransactionSubmitData(formData, split).savingsFundedAmount).toBe(250);
    // With interest the share applies to every financed payment, not the price.
    expect(buildTransactionSubmitData(formData, { ...withInterest, fundingMode: "savings" }).savingsFundedAmount).toBeCloseTo(1134.7, 2);
    expect(buildTransactionSubmitData(formData, { ...savings, fundingMode: "balance" as const })).not.toHaveProperty("savingsFundedAmount");
  });

  it("adds financing only when interest is on, normalizing by mode", () => {
    expect(buildTransactionSubmitData(formData, { ...withInterest, interestEnabled: false })).not.toHaveProperty("financing");
    expect(buildTransactionSubmitData(formData, withInterest).financing).toEqual({
      operationType: "purchase", interestSystem: "price", rateInputMode: "rate", rate: 2,
      ratePeriod: "monthly", downPayment: 0, fees: 0,
    });
    const installment = buildTransactionSubmitData(formData, {
      ...withInterest,
      financing: { ...withInterest.financing, interestSystem: "sac", rateInputMode: "installment", installmentAmount: 95 },
    }).financing;
    expect(installment).toMatchObject({ interestSystem: "price", installmentAmount: 95 });
    expect(installment).not.toHaveProperty("rate");
    const loan = buildTransactionSubmitData(formData, {
      ...withInterest,
      financing: { ...withInterest.financing, operationType: "loan", downPayment: 100 },
    }).financing;
    expect(loan?.downPayment).toBe(0);
  });
});

describe("getFirstChargeFromBalance", () => {
  it("uses the lump sum, the first linear installment or the first financed payment, minus savings", () => {
    expect(getFirstChargeFromBalance(1000, 1, DEFAULT_ADVANCED_OPTIONS)).toBe(1000);
    expect(getFirstChargeFromBalance(1000, 4, DEFAULT_ADVANCED_OPTIONS)).toBe(250);
    expect(getFirstChargeFromBalance(1000, 12, withInterest)).toBeCloseTo(94.56, 10);
    expect(getFirstChargeFromBalance(1000, 12, { ...withInterest, fundingMode: "split", savingsShare: 0.5 })).toBeCloseTo(47.28, 2);
    expect(getFirstChargeFromBalance(1000, 4, { ...DEFAULT_ADVANCED_OPTIONS, fundingMode: "savings" })).toBe(0);
    expect(getFirstChargeFromBalance(1000, 12, { ...withInterest, financing: { ...withInterest.financing, rate: undefined } })).toBe(0);
  });
});

describe("edit prefill", () => {
  it("maps a saved share of the total back to a funding mode", () => {
    expect(advancedFromSavings(0, 100)).toBe(DEFAULT_ADVANCED_OPTIONS);
    expect(advancedFromSavings(10, 0)).toBe(DEFAULT_ADVANCED_OPTIONS);
    expect(advancedFromSavings(100, 100)).toMatchObject({ enabled: true, fundingMode: "savings", savingsShare: 1 });
    expect(advancedFromSavings(25, 100)).toMatchObject({ enabled: true, fundingMode: "split", savingsShare: 0.25 });
  });

  it("rebuilds the financing inputs from a stored plan", () => {
    const plan = {
      operationType: "purchase" as const, interestSystem: "sac" as const, rateInputMode: "rate" as const,
      rate: 2, ratePeriod: "annual" as const, principal: 1000, downPayment: 100, fees: 5,
      installmentCount: 2, savingsFundedAmount: 0,
    };
    const row = { id: "r", date: "2030-01-15", principal: 0, interest: 0, savingsFunded: 0, balanceAfter: 0, isPaid: false };
    const breakdown = {
      plan, startDate: "2030-01-15", monthlyRate: 0, cet: { monthly: 0, annual: 0 },
      totals: { principal: 1000, downPayment: 100, fees: 5, interest: 0, payable: 1000, savingsFunded: 0 },
      rows: [{ ...row, number: null, payment: 100 }, { ...row, number: 1, payment: 460 }],
      outstanding: { principal: 0, interest: 0, total: 0 },
    };
    expect(advancedFromBreakdown(breakdown)).toMatchObject({
      enabled: true, interestEnabled: true, fundingMode: "balance",
      financing: { interestSystem: "sac", rate: 2, ratePeriod: "annual", installmentAmount: undefined, downPayment: 100, fees: 5 },
    });
    const installmentPlan = { ...breakdown, plan: { ...plan, rateInputMode: "installment" as const } };
    expect(advancedFromBreakdown(installmentPlan).financing).toMatchObject({ rate: undefined, installmentAmount: 460 });
  });
});

describe("goal link helpers", () => {
  it("submits goalId only when linked and restores it with withGoal", () => {
    const linked = { ...DEFAULT_ADVANCED_OPTIONS, enabled: true, goalId: "g1" };
    expect(buildTransactionSubmitData(formData, linked)).toMatchObject({ goalId: "g1" });
    expect(buildTransactionSubmitData(formData, { ...linked, goalId: null })).not.toHaveProperty("goalId");
    expect(withGoal(DEFAULT_ADVANCED_OPTIONS, "g1")).toMatchObject({ enabled: true, goalId: "g1" });
    expect(withGoal(DEFAULT_ADVANCED_OPTIONS, null)).toBe(DEFAULT_ADVANCED_OPTIONS);
  });
});

describe("TransactionAdvancedOptions", () => {
  function renderOptions(state: AdvancedOptionsState, onChange = vi.fn()) {
    render(<TransactionAdvancedOptions amount={1000} installmentCount={12} value={state} onChange={onChange} />);
    return onChange;
  }

  it("is collapsed by default and turns on via the switch", async () => {
    const onChange = renderOptions(DEFAULT_ADVANCED_OPTIONS);
    expect(screen.queryByText("transaction.advanced.payWith")).toBeNull();
    await userEvent.click(screen.getByRole("switch", { name: "transaction.advanced.toggle" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("shows the preview, the saved total and the balance alert when open", async () => {
    renderOptions(withInterest);
    expect(await screen.findByText("$800.00")).toBeTruthy();
    expect(screen.getByText("$94.56")).toBeTruthy();
    expect(screen.getByText("transaction.advanced.balanceAlert")).toBeTruthy();
  });

  it("links a goal through a select and clears it again", async () => {
    getGoalOptionsAction.mockResolvedValueOnce([{ id: "g1", name: "Trip", icon: "✈️" }]);
    const onChange = renderOptions({ ...DEFAULT_ADVANCED_OPTIONS, enabled: true });
    await userEvent.click(await screen.findByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: /Trip/ }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ goalId: "g1" }));
  });

  it("hides the goal select for loans", async () => {
    getGoalOptionsAction.mockResolvedValueOnce([{ id: "g1", name: "Trip", icon: "✈️" }]);
    renderOptions({
      ...withInterest,
      financing: { ...withInterest.financing, operationType: "loan" },
    });
    await screen.findByText("$800.00");
    expect(screen.queryByText("transaction.advanced.goal")).toBeNull();
  });

  it("waits for the rate before previewing, then flags invalid values", () => {
    renderOptions({ ...withInterest, financing: { ...withInterest.financing, rate: undefined } });
    expect(screen.queryByText("transaction.advanced.previewError")).toBeNull();
    cleanup();
    renderOptions({ ...withInterest, financing: { ...withInterest.financing, downPayment: 1000 } });
    expect(screen.getByText("transaction.advanced.previewError")).toBeTruthy();
  });
});
