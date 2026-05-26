export type TransactionLike = {
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
};

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
