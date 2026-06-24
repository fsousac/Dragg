import { type BudgetGroup } from "@/lib/finance/budget";

export const GROUP_COLORS = {
  needs: "#2563EB",
  wants: "#F6C453",
  savings: "#22C55E",
} as const satisfies Record<BudgetGroup, string>;
