import { describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addGoalFunds, createGoal, deleteGoal, updateGoal } = vi.hoisted(() => ({
  addGoalFunds: vi.fn().mockResolvedValue(undefined),
  createGoal: vi.fn().mockResolvedValue(undefined),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  updateGoal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/finance/transactions", () => ({
  addGoalFunds,
  createGoal,
  deleteGoal,
  updateGoal,
}));

import {
  addGoalFundsAction,
  createGoalAction,
  deleteGoalAction,
  updateGoalAction,
} from "@/app/goals/actions";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("createGoalAction", () => {
  it("parses and forwards a new goal, then revalidates dashboard/goals", async () => {
    await createGoalAction({
      color: "#ff0000",
      currentAmount: 100,
      deadline: "2026-12-31",
      icon: "🏖️",
      name: "Vacation",
      targetAmount: 5000,
    });

    expect(createGoal).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Vacation", targetAmount: 5000 }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/goals");
  });
});

describe("updateGoalAction", () => {
  it("parses and forwards an updated goal", async () => {
    await updateGoalAction({
      id: uuid,
      color: "#00ff00",
      deadline: "2026-12-31",
      icon: "🏖️",
      name: "Vacation updated",
      targetAmount: 6000,
    });

    expect(updateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ id: uuid, name: "Vacation updated" }),
    );
  });
});

describe("addGoalFundsAction", () => {
  it("parses the goal id and amount, then forwards them", async () => {
    await addGoalFundsAction(uuid, 250);

    expect(addGoalFunds).toHaveBeenCalledWith(uuid, 250);
    expect(revalidatePath).toHaveBeenCalledWith("/goals");
  });
});

describe("deleteGoalAction", () => {
  it("parses the goal id and deletes it", async () => {
    await deleteGoalAction(uuid);

    expect(deleteGoal).toHaveBeenCalledWith(uuid);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
