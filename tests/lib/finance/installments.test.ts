import { describe, expect, it } from "vitest";

import {
  createInstallmentMetadata,
  getInstallmentPrepaymentSummary,
  getInstallmentLabel,
  groupTransactionsByInstallmentGroup,
  isInstallmentTransaction,
  selectInstallmentsForDeletion,
  selectInstallmentsForPrepayment,
  type TransactionLike,
} from "@/lib/finance/installments";

function installment(
  overrides: Partial<TransactionLike> & { id: string },
): TransactionLike & { id: string } {
  return {
    installmentGroupId: "group-1",
    installmentNumber: 1,
    installmentTotal: 3,
    ...overrides,
  };
}

describe("installment helpers", () => {
  it("identifies a valid installment transaction", () => {
    expect(
      isInstallmentTransaction(
        installment({
          id: "transaction-1",
        }),
      ),
    ).toBe(true);
  });

  it("rejects non-installment transactions", () => {
    expect(isInstallmentTransaction({})).toBe(false);
    expect(
      isInstallmentTransaction({
        installmentGroupId: null,
        installmentNumber: null,
        installmentTotal: null,
      }),
    ).toBe(false);
  });

  it("rejects partially populated installment metadata", () => {
    expect(
      isInstallmentTransaction({
        installmentGroupId: "group-1",
        installmentNumber: 1,
      }),
    ).toBe(false);
    expect(
      isInstallmentTransaction({
        installmentGroupId: "group-1",
        installmentTotal: 3,
      }),
    ).toBe(false);
    expect(
      isInstallmentTransaction({
        installmentNumber: 1,
        installmentTotal: 3,
      }),
    ).toBe(false);
  });

  it("returns installment labels for valid installment transactions", () => {
    expect(
      getInstallmentLabel(
        installment({
          id: "transaction-2",
          installmentNumber: 2,
          installmentTotal: 6,
        }),
      ),
    ).toBe("2/6");
    expect(getInstallmentLabel({})).toBeNull();
  });

  it("groups transactions with the same installment group id", () => {
    const groups = groupTransactionsByInstallmentGroup([
      installment({ id: "installment-2", installmentNumber: 2 }),
      installment({ id: "installment-1", installmentNumber: 1 }),
    ]);

    expect(groups.get("group-1")?.map((transaction) => transaction.id)).toEqual(
      ["installment-1", "installment-2"],
    );
  });

  it("ignores non-installment transactions while grouping", () => {
    const groups = groupTransactionsByInstallmentGroup([
      installment({ id: "installment-1" }),
      { id: "standalone" },
    ]);

    expect(groups.get("group-1")).toHaveLength(1);
    expect([...groups.values()].flat()).not.toContainEqual({ id: "standalone" });
  });

  it("keeps groups separated by installment group id", () => {
    const groups = groupTransactionsByInstallmentGroup([
      installment({ id: "group-1-installment", installmentGroupId: "group-1" }),
      installment({ id: "group-2-installment", installmentGroupId: "group-2" }),
    ]);

    expect(groups.get("group-1")?.map((transaction) => transaction.id)).toEqual([
      "group-1-installment",
    ]);
    expect(groups.get("group-2")?.map((transaction) => transaction.id)).toEqual([
      "group-2-installment",
    ]);
  });

  it("creates 1-based installment metadata with a shared group id", () => {
    const groupId = "0fbd6e64-c6b1-49fd-91d1-3cb47d5d6f6a";
    const metadata = [1, 2, 3].map((installmentNumber) =>
      createInstallmentMetadata({
        groupId,
        installmentNumber,
        installmentTotal: 3,
      }),
    );

    expect(metadata).toEqual([
      {
        installmentGroupId: groupId,
        installmentNumber: 1,
        installmentTotal: 3,
      },
      {
        installmentGroupId: groupId,
        installmentNumber: 2,
        installmentTotal: 3,
      },
      {
        installmentGroupId: groupId,
        installmentNumber: 3,
        installmentTotal: 3,
      },
    ]);
  });

  it("rejects invalid generated installment metadata", () => {
    expect(() =>
      createInstallmentMetadata({
        groupId: "group-1",
        installmentNumber: 4,
        installmentTotal: 3,
      }),
    ).toThrow("Installment metadata is invalid.");
  });

  it("selects only the current installment for single deletion", () => {
    const selected = installment({ id: "installment-2", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "single",
        selectedTransaction: selected,
        transactions: [
          installment({ id: "installment-1", installmentNumber: 1 }),
          selected,
          installment({ id: "installment-3", installmentNumber: 3 }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-2"]);
  });

  it("selects current and future installments for scoped deletion", () => {
    const selected = installment({ id: "installment-2", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "this_and_following",
        selectedTransaction: selected,
        transactions: [
          installment({ id: "installment-1", installmentNumber: 1 }),
          installment({ id: "other-group", installmentGroupId: "group-2" }),
          installment({ id: "installment-3", installmentNumber: 3 }),
          selected,
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-2", "installment-3"]);
  });

  it("does not select previous, unrelated, or non-installment rows for scoped deletion", () => {
    const selected = installment({ id: "installment-2", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "this_and_following",
        selectedTransaction: selected,
        transactions: [
          installment({ id: "installment-1", installmentNumber: 1 }),
          selected,
          installment({ id: "installment-3", installmentNumber: 3 }),
          installment({
            id: "other-group",
            installmentGroupId: "group-2",
            installmentNumber: 3,
          }),
          { id: "standalone" },
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-2", "installment-3"]);
  });

  it("selects all installments for all deletion", () => {
    const selected = installment({ id: "installment-2", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "all",
        selectedTransaction: selected,
        transactions: [
          installment({ id: "installment-1", installmentNumber: 1 }),
          selected,
          installment({ id: "installment-3", installmentNumber: 3 }),
          installment({ id: "other-group", installmentGroupId: "group-2" }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-1", "installment-2", "installment-3"]);
  });

  it("falls back to the selected row when grouped deletion metadata is invalid", () => {
    const selected = { id: "partial", installmentGroupId: "group-1" };

    expect(
      selectInstallmentsForDeletion({
        scope: "this_and_following",
        selectedTransaction: selected,
        transactions: [installment({ id: "installment-1" }), selected],
      }),
    ).toEqual([selected]);
  });

  it("prepayment selects only remaining future installments", () => {
    const selected = installment({
      date: "2026-05-10",
      id: "installment-2",
      installmentNumber: 2,
      installmentTotal: 5,
    });

    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        selectedTransaction: selected,
        transactions: [
          installment({
            date: "2026-04-10",
            id: "installment-1",
            installmentNumber: 1,
            installmentTotal: 5,
          }),
          selected,
          installment({
            date: "2026-06-10",
            id: "installment-3",
            installmentNumber: 3,
            installmentTotal: 5,
          }),
          installment({
            date: "2026-07-10",
            id: "installment-4",
            installmentNumber: 4,
            installmentTotal: 5,
          }),
          installment({
            date: "2026-08-10",
            id: "other-group",
            installmentGroupId: "group-2",
            installmentNumber: 5,
            installmentTotal: 5,
          }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-3", "installment-4"]);
  });

  it("summarizes available installment prepayment quantity and amount", () => {
    const selected = installment({
      date: "2026-05-10",
      id: "installment-1",
      installmentNumber: 1,
      installmentTotal: 4,
    });
    const available = selectInstallmentsForPrepayment({
      currentMonth: "2026-05",
      selectedTransaction: selected,
      transactions: [
        selected,
        installment({
          amount: -33.33,
          date: "2026-06-10",
          id: "installment-2",
          installmentNumber: 2,
          installmentTotal: 4,
        }),
        installment({
          amount: -33.34,
          date: "2026-07-10",
          id: "installment-3",
          installmentNumber: 3,
          installmentTotal: 4,
        }),
        installment({
          advancedToMonth: "2026-05",
          amount: -33.33,
          date: "2026-08-10",
          id: "already-advanced",
          installmentNumber: 4,
          installmentTotal: 4,
        }),
      ],
    });

    expect(getInstallmentPrepaymentSummary(available)).toEqual({
      count: 2,
      totalAmount: 66.67,
    });
  });

  it("limits prepayment to the earliest N remaining installments when count is given", () => {
    const selected = installment({
      date: "2026-05-10",
      id: "installment-1",
      installmentNumber: 1,
      installmentTotal: 4,
    });

    expect(
      selectInstallmentsForPrepayment({
        count: 1,
        currentMonth: "2026-05",
        selectedTransaction: selected,
        transactions: [
          selected,
          installment({
            date: "2026-06-10",
            id: "installment-2",
            installmentNumber: 2,
            installmentTotal: 4,
          }),
          installment({
            date: "2026-07-10",
            id: "installment-3",
            installmentNumber: 3,
            installmentTotal: 4,
          }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-2"]);
  });

  it("treats missing installment amounts as zero in prepayment summaries", () => {
    expect(
      getInstallmentPrepaymentSummary([
        installment({ id: "without-amount" }),
      ]),
    ).toEqual({
      count: 1,
      totalAmount: 0,
    });
  });

  it("prepayment ignores installments that were already advanced", () => {
    const selected = installment({
      date: "2026-05-10",
      id: "installment-2",
      installmentNumber: 2,
      installmentTotal: 4,
    });

    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        selectedTransaction: selected,
        transactions: [
          selected,
          installment({
            advancedToMonth: "2026-05",
            date: "2026-06-10",
            id: "already-advanced",
            installmentNumber: 3,
            installmentTotal: 4,
          }),
          installment({
            date: "2026-07-10",
            id: "remaining",
            installmentNumber: 4,
            installmentTotal: 4,
          }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["remaining"]);
  });

  it("keeps installment category metadata untouched for pure selections", () => {
    const selected = installment({
      id: "installment-1",
      installmentNumber: 1,
    }) as TransactionLike & { categoryKey: string };
    const remaining = installment({
      date: "2026-06-10",
      id: "installment-2",
      installmentNumber: 2,
    }) as TransactionLike & { categoryKey: string };

    selected.categoryKey = "data.category.education";
    remaining.categoryKey = "data.category.education";

    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        selectedTransaction: selected,
        transactions: [selected, remaining],
      }),
    ).toEqual([remaining]);
    expect(remaining.categoryKey).toBe("data.category.education");
  });

  it("prepayment can include the selected installment explicitly", () => {
    const selected = installment({
      date: "2026-06-10",
      id: "installment-2",
      installmentNumber: 2,
      installmentTotal: 3,
    });

    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        scope: "selected_and_remaining",
        selectedTransaction: selected,
        transactions: [
          selected,
          installment({
            date: "2026-07-10",
            id: "installment-3",
            installmentNumber: 3,
          }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["installment-2", "installment-3"]);
  });

  it("uses date as a secondary order when installment numbers match", () => {
    const selected = installment({ id: "selected", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "this_and_following",
        selectedTransaction: selected,
        transactions: [
          installment({
            date: "2026-07-10",
            id: "duplicate-later",
            installmentNumber: 2,
          }),
          installment({
            date: "2026-06-10",
            id: "duplicate-earlier",
            installmentNumber: 2,
          }),
          selected,
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["selected", "duplicate-earlier", "duplicate-later"]);
  });

  it("does not select prepayment rows when selected metadata is invalid", () => {
    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        selectedTransaction: { id: "partial", installmentGroupId: "group-1" },
        transactions: [installment({ id: "installment-1" })],
      }),
    ).toEqual([]);
  });

  it("handles missing dates while ordering and filtering prepayment candidates", () => {
    const selected = installment({
      id: "selected",
      installmentNumber: 1,
      installmentTotal: 3,
    });

    expect(
      selectInstallmentsForPrepayment({
        currentMonth: "2026-05",
        selectedTransaction: selected,
        transactions: [
          selected,
          installment({
            id: "without-date",
            installmentNumber: 2,
            installmentTotal: 3,
          }),
          installment({
            date: "2026-06-10",
            id: "with-date",
            installmentNumber: 3,
            installmentTotal: 3,
          }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["with-date"]);
  });

  it("keeps duplicate installment numbers stable when dates are unavailable", () => {
    const selected = installment({ id: "selected", installmentNumber: 2 });

    expect(
      selectInstallmentsForDeletion({
        scope: "this_and_following",
        selectedTransaction: selected,
        transactions: [
          selected,
          installment({ id: "duplicate", installmentNumber: 2 }),
        ],
      }).map((transaction) => transaction.id),
    ).toEqual(["selected", "duplicate"]);
  });
});
