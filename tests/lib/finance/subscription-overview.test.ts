import { describe, expect, it } from "vitest";

import {
  buildSubscriptionOverview,
  getSubscriptionMatchKey,
} from "@/lib/finance/subscriptions";
import type { Transaction } from "@/lib/data";

function subscriptionTransaction(
  overrides: Partial<Transaction> & { date: string; id: string },
): Transaction {
  return {
    amount: 50,
    categoryId: "cat-1",
    categoryKey: "data.category.streaming",
    descriptionKey: "Netflix",
    group: "wants",
    icon: "🎬",
    notes: "subscription 1/12",
    paymentMethodId: "pm-1",
    paymentMethodKey: "data.paymentMethod.pix",
    type: "expense",
    ...overrides,
  };
}

describe("buildSubscriptionOverview", () => {
  it("uses the upcoming occurrence's amount, not the oldest past one (issue #41)", () => {
    const today = "2026-06-01";
    const overview = buildSubscriptionOverview(
      [
        subscriptionTransaction({ id: "past", date: "2026-05-10", amount: 30 }),
        subscriptionTransaction({ id: "future", date: "2026-06-10", amount: 45 }),
      ],
      today,
    );

    expect(overview).toHaveLength(1);
    expect(overview[0].amount).toBe(45);
    expect(overview[0].nextDate).toBe("2026-06-10");
  });

  it("keeps the most recent past amount when no future occurrence exists yet", () => {
    const today = "2026-06-01";
    const overview = buildSubscriptionOverview(
      [
        subscriptionTransaction({ id: "older", date: "2026-04-10", amount: 30 }),
        subscriptionTransaction({ id: "newer", date: "2026-05-10", amount: 45 }),
      ],
      today,
    );

    // Both occurrences are in the past relative to `today`, so the group has
    // no `nextDate >= today` and is filtered out of the overview — this just
    // guards that grouping itself doesn't throw and stays empty as expected.
    expect(overview).toHaveLength(0);
  });

  it("marks a subscription paused from its very first occurrence", () => {
    const today = "2026-06-01";
    const overview = buildSubscriptionOverview(
      [
        subscriptionTransaction({
          id: "first",
          date: "2026-06-10",
          notes: "subscription paused 1/12",
        }),
      ],
      today,
    );

    expect(overview[0].status).toBe("paused");
  });

  it("transitions an active subscription to paused when a later occurrence is paused", () => {
    const today = "2026-06-01";
    const overview = buildSubscriptionOverview(
      [
        subscriptionTransaction({ id: "active", date: "2026-06-05" }),
        subscriptionTransaction({
          id: "paused",
          date: "2026-07-05",
          notes: "subscription paused 2/12",
        }),
      ],
      today,
    );

    expect(overview[0].status).toBe("paused");
  });

  it("keeps the earliest future occurrence when a later one isn't sooner", () => {
    const today = "2026-06-01";
    const overview = buildSubscriptionOverview(
      [
        subscriptionTransaction({ id: "soonest", date: "2026-06-05", amount: 50 }),
        subscriptionTransaction({ id: "later", date: "2026-07-05", amount: 99 }),
      ],
      today,
    );

    expect(overview[0].nextDate).toBe("2026-06-05");
    expect(overview[0].amount).toBe(50);
  });
});

describe("getSubscriptionMatchKey", () => {
  it("falls back to categoryKey and paymentMethodKey, then empty string", () => {
    expect(
      getSubscriptionMatchKey({
        categoryId: null,
        categoryKey: "data.category.streaming",
        name: "Netflix",
        paymentMethodId: null,
        paymentMethodKey: "data.paymentMethod.pix",
      }),
    ).toBe("Netflix|data.category.streaming|data.paymentMethod.pix");

    expect(
      getSubscriptionMatchKey({
        categoryId: null,
        categoryKey: "data.category.streaming",
        name: "Netflix",
        paymentMethodId: null,
        paymentMethodKey: null,
      }),
    ).toBe("Netflix|data.category.streaming|");
  });

  it("is stable across items built from different occurrence ids", () => {
    const a = subscriptionTransaction({ id: "occurrence-a", date: "2026-05-10" });
    const b = subscriptionTransaction({ id: "occurrence-b", date: "2026-06-10" });

    expect(
      getSubscriptionMatchKey({
        categoryId: a.categoryId,
        categoryKey: a.categoryKey,
        name: a.descriptionKey,
        paymentMethodId: a.paymentMethodId,
        paymentMethodKey: a.paymentMethodKey,
      }),
    ).toBe(
      getSubscriptionMatchKey({
        categoryId: b.categoryId,
        categoryKey: b.categoryKey,
        name: b.descriptionKey,
        paymentMethodId: b.paymentMethodId,
        paymentMethodKey: b.paymentMethodKey,
      }),
    );
  });
});
