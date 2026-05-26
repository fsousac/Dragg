import { describe, expect, it } from "vitest";

import {
  isPausedSubscriptionOccurrence,
  selectSubscriptionOccurrencesForDeletion,
  shouldShowSubscriptionOccurrenceInTransactionHistory,
  type SubscriptionOccurrenceLike,
} from "@/lib/finance/subscriptions";

function occurrence(
  overrides: Partial<SubscriptionOccurrenceLike> & { id: string },
): SubscriptionOccurrenceLike {
  return {
    date: "2026-05-10",
    notes: "subscription 1/12",
    ...overrides,
  };
}

describe("subscription occurrence helpers", () => {
  it("detects paused generated subscription occurrences", () => {
    expect(
      isPausedSubscriptionOccurrence(
        occurrence({ id: "paused", notes: "subscription paused 2/12" }),
      ),
    ).toBe(true);
    expect(
      isPausedSubscriptionOccurrence(
        occurrence({ id: "active", notes: "subscription 2/12" }),
      ),
    ).toBe(false);
    expect(
      isPausedSubscriptionOccurrence(
        occurrence({ id: "without-notes", notes: null }),
      ),
    ).toBe(false);
  });

  it("hides paused subscription occurrences from transaction history by default", () => {
    expect(
      shouldShowSubscriptionOccurrenceInTransactionHistory({
        occurrence: occurrence({
          id: "paused",
          notes: "subscription paused 2/12",
        }),
      }),
    ).toBe(false);
    expect(
      shouldShowSubscriptionOccurrenceInTransactionHistory({
        occurrence: occurrence({ id: "active", notes: "subscription 2/12" }),
      }),
    ).toBe(true);
  });

  it("can include paused subscriptions for subscription management views", () => {
    expect(
      shouldShowSubscriptionOccurrenceInTransactionHistory({
        includePausedSubscriptions: true,
        occurrence: occurrence({
          id: "paused",
          notes: "subscription paused 2/12",
        }),
      }),
    ).toBe(true);
  });

  it("selects only the selected subscription occurrence for single deletion", () => {
    const selected = occurrence({ id: "selected" });

    expect(
      selectSubscriptionOccurrencesForDeletion({
        occurrences: [
          occurrence({ date: "2026-04-10", id: "previous" }),
          selected,
          occurrence({ date: "2026-06-10", id: "future" }),
        ],
        scope: "single",
        selectedOccurrence: selected,
        today: "2026-05-01",
      }).map((item) => item.id),
    ).toEqual(["selected"]);
  });

  it("selects selected and following future occurrences for grouped deletion", () => {
    const selected = occurrence({ date: "2026-05-10", id: "selected" });

    expect(
      selectSubscriptionOccurrencesForDeletion({
        occurrences: [
          occurrence({ date: "2026-04-10", id: "historical-paid" }),
          selected,
          occurrence({ date: "2026-06-10", id: "future-1" }),
          occurrence({ date: "2026-07-10", id: "future-2" }),
        ],
        scope: "this_and_following_unpaid",
        selectedOccurrence: selected,
        today: "2026-05-01",
      }).map((item) => item.id),
    ).toEqual(["selected", "future-1", "future-2"]);
  });

  it("preserves historical paid occurrences before the selected occurrence", () => {
    const selected = occurrence({ date: "2026-06-10", id: "selected" });

    expect(
      selectSubscriptionOccurrencesForDeletion({
        occurrences: [
          occurrence({ date: "2026-04-10", id: "historical-paid" }),
          occurrence({ date: "2026-05-10", id: "current-paid" }),
          selected,
          occurrence({ date: "2026-07-10", id: "future" }),
        ],
        scope: "this_and_following_unpaid",
        selectedOccurrence: selected,
        today: "2026-05-26",
      }).map((item) => item.id),
    ).toEqual(["selected", "future"]);
  });
});
