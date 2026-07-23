import type { Transaction } from "@/lib/data";

export type SubscriptionOccurrenceLike = {
  date: string;
  id: string;
  notes?: string | null;
};

export type SubscriptionOverviewItem = {
  amount: number;
  categoryId?: string | null;
  categoryKey: string;
  frequency: "monthly";
  icon: string;
  id: string;
  name: string;
  nextDate: string;
  paymentMethodId?: string | null;
  paymentMethodKey?: string | null;
  status: "active" | "paused";
};

export function getSubscriptionMatchKey(
  subscription: Pick<
    SubscriptionOverviewItem,
    | "categoryId"
    | "categoryKey"
    | "name"
    | "paymentMethodId"
    | "paymentMethodKey"
  >,
) {
  return [
    subscription.name,
    subscription.categoryId ?? subscription.categoryKey,
    subscription.paymentMethodId ?? subscription.paymentMethodKey ?? "",
  ].join("|");
}

function createSubscriptionOverviewItem(
  transaction: Transaction,
): SubscriptionOverviewItem {
  return {
    amount: Math.abs(transaction.amount),
    categoryId: transaction.categoryId,
    categoryKey: transaction.categoryKey,
    frequency: "monthly",
    icon: transaction.icon,
    id: transaction.id,
    name: transaction.descriptionKey,
    nextDate: transaction.date,
    paymentMethodId: transaction.paymentMethodId,
    paymentMethodKey: transaction.paymentMethodKey,
    status: transaction.notes?.includes("paused") ? "paused" : "active",
  };
}

function applySubscriptionOccurrence(
  existingSubscription: SubscriptionOverviewItem,
  transaction: Transaction,
  today: string,
): void {
  const isFutureOrToday = transaction.date >= today;

  if (
    isFutureOrToday &&
    transaction.notes?.includes("paused") &&
    existingSubscription.status === "active"
  ) {
    existingSubscription.status = "paused";
  }

  if (isFutureOrToday) {
    if (
      existingSubscription.nextDate < today ||
      transaction.date < existingSubscription.nextDate
    ) {
      existingSubscription.nextDate = transaction.date;
      existingSubscription.amount = Math.abs(transaction.amount);
    }
  } else {
    existingSubscription.amount = Math.abs(transaction.amount);
  }
}

export function buildSubscriptionOverview(
  transactions: Transaction[],
  today: string,
): SubscriptionOverviewItem[] {
  const subscriptionTransactions = transactions
    .filter((transaction) => transaction.notes?.startsWith("subscription"))
    .sort((left, right) => left.date.localeCompare(right.date));
  const groupedSubscriptions = new Map<string, SubscriptionOverviewItem>();

  for (const transaction of subscriptionTransactions) {
    const groupKey = getSubscriptionMatchKey({
      categoryId: transaction.categoryId,
      categoryKey: transaction.categoryKey,
      name: transaction.descriptionKey,
      paymentMethodId: transaction.paymentMethodId,
      paymentMethodKey: transaction.paymentMethodKey,
    });
    const existingSubscription = groupedSubscriptions.get(groupKey);

    if (!existingSubscription) {
      groupedSubscriptions.set(
        groupKey,
        createSubscriptionOverviewItem(transaction),
      );
      continue;
    }

    applySubscriptionOccurrence(existingSubscription, transaction, today);
  }

  return [...groupedSubscriptions.values()].filter(
    (subscription) => subscription.nextDate >= today,
  );
}

export type SubscriptionOccurrenceDeleteScope =
  "single" | "this_and_following_unpaid";

export function isPausedSubscriptionOccurrence(
  occurrence: SubscriptionOccurrenceLike,
) {
  return occurrence.notes?.startsWith("subscription paused") ?? false;
}

export function shouldShowSubscriptionOccurrenceInTransactionHistory(input: {
  includePausedSubscriptions?: boolean;
  occurrence: SubscriptionOccurrenceLike;
}) {
  return (
    Boolean(input.includePausedSubscriptions) ||
    !isPausedSubscriptionOccurrence(input.occurrence)
  );
}

export function selectSubscriptionOccurrencesForDeletion<
  TOccurrence extends SubscriptionOccurrenceLike,
>(input: {
  occurrences: TOccurrence[];
  scope: SubscriptionOccurrenceDeleteScope;
  selectedOccurrence: TOccurrence;
  today: string;
}) {
  if (input.scope === "single") {
    return [input.selectedOccurrence];
  }

  return input.occurrences.filter(
    (occurrence) =>
      occurrence.id === input.selectedOccurrence.id ||
      (occurrence.date > input.selectedOccurrence.date &&
        occurrence.date >= input.today),
  );
}
