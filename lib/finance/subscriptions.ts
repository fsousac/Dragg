export type SubscriptionOccurrenceLike = {
  date: string;
  id: string;
  notes?: string | null;
};

export type SubscriptionOccurrenceDeleteScope =
  | "single"
  | "this_and_following_unpaid";

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
