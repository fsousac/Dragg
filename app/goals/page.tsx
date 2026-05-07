import { AppShell } from "@/components/dashboard/app-shell"
import { GoalsScreen } from "@/components/dashboard/goals-screen"
import {
  addGoalFundsAction,
  createGoalAction,
  deleteGoalAction,
  updateGoalAction,
} from "@/app/goals/actions"
import { listGoals } from "@/lib/finance/transactions"

export default async function GoalsPage() {
  const goals = await listGoals()

  return (
    <AppShell>
      <GoalsScreen
        addGoalFundsAction={addGoalFundsAction}
        createGoalAction={createGoalAction}
        deleteGoalAction={deleteGoalAction}
        goals={goals}
        updateGoalAction={updateGoalAction}
      />
    </AppShell>
  )
}
