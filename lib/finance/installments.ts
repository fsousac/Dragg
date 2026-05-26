export type TransactionLike = {
  advancedToMonth?: string | null;
  date?: string | null;
  id?: string;
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
};

export type InstallmentDeleteScope =
  | "single"
  | "this_and_following"
  | "all";

export type InstallmentPrepaymentScope =
  | "remaining"
  | "selected_and_remaining";

export type InstallmentMetadata = {
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
};

function hasValidInstallmentNumber(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1;
}

export function isInstallmentTransaction(
  transaction: TransactionLike,
): boolean {
  return (
    typeof transaction.installmentGroupId === "string" &&
    transaction.installmentGroupId.trim().length > 0 &&
    hasValidInstallmentNumber(transaction.installmentNumber) &&
    hasValidInstallmentNumber(transaction.installmentTotal) &&
    Number(transaction.installmentNumber) <= Number(transaction.installmentTotal)
  );
}

export function getInstallmentLabel(transaction: TransactionLike) {
  if (!isInstallmentTransaction(transaction)) {
    return null;
  }

  return `${transaction.installmentNumber}/${transaction.installmentTotal}`;
}

export function groupTransactionsByInstallmentGroup<
  TTransaction extends TransactionLike,
>(transactions: TTransaction[]) {
  const groups = new Map<string, TTransaction[]>();

  for (const transaction of transactions) {
    if (!isInstallmentTransaction(transaction)) {
      continue;
    }

    const groupId = transaction.installmentGroupId as string;
    const group = groups.get(groupId) ?? [];
    group.push(transaction);
    groups.set(groupId, group);
  }

  for (const group of groups.values()) {
    group.sort(
      (left, right) =>
        Number(left.installmentNumber) - Number(right.installmentNumber),
    );
  }

  return groups;
}

function isSameInstallmentGroup(
  transaction: TransactionLike,
  selectedTransaction: TransactionLike,
) {
  return (
    isInstallmentTransaction(transaction) &&
    isInstallmentTransaction(selectedTransaction) &&
    transaction.installmentGroupId === selectedTransaction.installmentGroupId
  );
}

function compareInstallmentOrder(
  left: TransactionLike,
  right: TransactionLike,
) {
  const installmentOrder =
    Number(left.installmentNumber) - Number(right.installmentNumber);

  if (installmentOrder !== 0) {
    return installmentOrder;
  }

  return String(left.date ?? "").localeCompare(String(right.date ?? ""));
}

export function selectInstallmentsForDeletion<
  TTransaction extends TransactionLike,
>(input: {
  scope: InstallmentDeleteScope;
  selectedTransaction: TTransaction;
  transactions: TTransaction[];
}) {
  if (input.scope === "single") {
    return [input.selectedTransaction];
  }

  if (!isInstallmentTransaction(input.selectedTransaction)) {
    return [input.selectedTransaction];
  }

  const sameGroup = input.transactions
    .filter((transaction) =>
      isSameInstallmentGroup(transaction, input.selectedTransaction),
    )
    .sort(compareInstallmentOrder);

  if (input.scope === "all") {
    return sameGroup;
  }

  return sameGroup.filter(
    (transaction) =>
      Number(transaction.installmentNumber) >=
      Number(input.selectedTransaction.installmentNumber),
  );
}

export function selectInstallmentsForPrepayment<
  TTransaction extends TransactionLike,
>(input: {
  currentMonth: string;
  scope?: InstallmentPrepaymentScope;
  selectedTransaction: TTransaction;
  transactions: TTransaction[];
}) {
  if (!isInstallmentTransaction(input.selectedTransaction)) {
    return [];
  }

  const scope = input.scope ?? "remaining";
  const selectedNumber = Number(input.selectedTransaction.installmentNumber);

  return input.transactions
    .filter((transaction) =>
      isSameInstallmentGroup(transaction, input.selectedTransaction),
    )
    .filter((transaction) => !transaction.advancedToMonth)
    .filter((transaction) => {
      const installmentNumber = Number(transaction.installmentNumber);
      const isSelectedOrAfter =
        scope === "selected_and_remaining"
          ? installmentNumber >= selectedNumber
          : installmentNumber > selectedNumber;
      const transactionMonth = String(transaction.date ?? "").slice(0, 7);

      return isSelectedOrAfter && transactionMonth > input.currentMonth;
    })
    .sort(compareInstallmentOrder);
}

export function createInstallmentMetadata(options: {
  groupId: string;
  installmentNumber: number;
  installmentTotal: number;
}): InstallmentMetadata {
  const metadata = {
    installmentGroupId: options.groupId,
    installmentNumber: options.installmentNumber,
    installmentTotal: options.installmentTotal,
  };

  if (!isInstallmentTransaction(metadata)) {
    throw new Error("Installment metadata is invalid.");
  }

  return metadata;
}
