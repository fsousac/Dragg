import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FinancingBreakdown } from "@/components/dashboard/financing-breakdown";
import { buildFinancingBreakdown } from "@/lib/finance/financing";

const { getFinancingBreakdownAction } = vi.hoisted(() => ({ getFinancingBreakdownAction: vi.fn() }));
vi.mock("@/app/transactions/actions", () => ({ getFinancingBreakdownAction }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string) => value,
    formatNumber: (value: number) => value.toFixed(2),
    t: (key: string) => key,
  }),
}));

const PLAN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const breakdown = buildFinancingBreakdown(
  {
    operationType: "purchase", interestSystem: "price", rateInputMode: "rate", rate: 12,
    ratePeriod: "annual", principal: 1000, downPayment: 0, fees: 0, installmentCount: 1,
    savingsFundedAmount: 0,
  },
  [{ id: "r1", date: "2030-01-15", amount: 1009.49, kind: "expense", installmentNumber: 1, principalPortion: 1000, interestPortion: 9.49, savingsFundedAmount: 0 }],
  "2029-12-31",
);

describe("FinancingBreakdown", () => {
  it("renders totals, rates and the schedule", async () => {
    getFinancingBreakdownAction.mockResolvedValue(breakdown);
    render(<FinancingBreakdown planId={PLAN_ID} />);
    expect(await screen.findByText("financing.title")).toBeTruthy();
    expect(getFinancingBreakdownAction).toHaveBeenCalledWith(PLAN_ID);
    expect(screen.getAllByText("$1009.49").length).toBeGreaterThan(0);
    expect(screen.getByText("financing.equivalentMonthly")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("labels an extra payment row instead of calling it a down payment", async () => {
    const amortized = buildFinancingBreakdown(
      breakdown.plan,
      [
        { id: "am", date: "2029-12-20", amount: 100, kind: "expense", installmentNumber: null, principalPortion: 100, interestPortion: 0, savingsFundedAmount: 0, isAmortization: true },
        { id: "r1", date: "2030-01-15", amount: 909.49, kind: "expense", installmentNumber: 1, principalPortion: 900, interestPortion: 9.49, savingsFundedAmount: 0 },
      ],
      "2029-12-31",
    );
    getFinancingBreakdownAction.mockResolvedValue(amortized);
    render(<FinancingBreakdown planId={PLAN_ID} />);
    expect(await screen.findByText(/financing.table.amortized/)).toBeTruthy();
    expect(screen.queryByText(/financing.table.downPayment/)).toBeNull();
  });

  it("renders nothing for a foreign or missing plan", async () => {
    getFinancingBreakdownAction.mockResolvedValue(null);
    const { container } = render(<FinancingBreakdown planId={PLAN_ID} />);
    await vi.waitFor(() => expect(container.textContent).toBe(""));
  });

  it("shows an error message when loading fails", async () => {
    getFinancingBreakdownAction.mockRejectedValue(new Error("boom"));
    render(<FinancingBreakdown planId={PLAN_ID} />);
    expect(await screen.findByText("financing.error")).toBeTruthy();
  });
});
