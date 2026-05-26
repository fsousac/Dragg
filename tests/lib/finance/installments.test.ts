import { describe, expect, it } from "vitest";

import {
  createInstallmentMetadata,
  getInstallmentLabel,
  groupTransactionsByInstallmentGroup,
  isInstallmentTransaction,
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
});
