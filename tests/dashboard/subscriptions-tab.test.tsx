import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SubscriptionsTab } from "@/components/dashboard/subscriptions-tab";
import type { SubscriptionOverviewItem } from "@/lib/finance/subscriptions";

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    formatDate: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value,
    t: (key: string) => key,
  }),
}));

const subscription: SubscriptionOverviewItem = {
  amount: 25,
  categoryKey: "categories.entertainment",
  frequency: "monthly",
  icon: "🎬",
  id: "sub-1",
  name: "Streaming",
  nextDate: "2026-10-01",
  status: "active",
};

describe("SubscriptionsTab icon background theming", () => {
  it("uses a theme-aware muted background, not the static accent token", () => {
    const { container } = render(
      <SubscriptionsTab
        isPending={false}
        onDeleteSubscription={vi.fn()}
        onEditSubscription={vi.fn()}
        onToggleSubscriptionStatus={vi.fn()}
        subscriptions={[subscription]}
      />,
    );

    const iconContainer = container.querySelector(".rounded-lg.bg-muted");
    expect(iconContainer).not.toBeNull();
    expect(container.querySelector(".rounded-lg.bg-accent")).toBeNull();
  });
});
