"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  MoreVertical,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CurrencyInput } from "@/components/dashboard/form-inputs/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  type CreateGoalInput,
  type GoalOverviewItem,
  type UpdateGoalInput,
} from "@/lib/finance/transactions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type GoalsScreenProps = {
  addGoalFundsAction: (goalId: string, amount: number) => Promise<void>;
  createGoalAction: (data: CreateGoalInput) => Promise<void>;
  deleteGoalAction: (goalId: string) => Promise<void>;
  goals: GoalOverviewItem[];
  updateGoalAction: (data: UpdateGoalInput) => Promise<void>;
};

type GoalFormState = {
  color: string;
  currentAmount: number;
  deadline: string;
  icon: string;
  name: string;
  targetAmount: number;
};

const goalIcons = ["🎯", "🏦", "✈️", "🚗", "🏠", "📈", "🎓", "💻"];
// Fixed hex values (not CSS var(--...) references) because the goal color
// is persisted server-side and validated against a strict hex pattern
// (see app/goals/actions.ts) — a stored value must render the same way
// regardless of which theme is active when it's read back.
const goalColors = [
  "#22c55e",
  "#6d28d9",
  "#c2410c",
  "#be185d",
  "#15803d",
  "#a78bfa",
];

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialGoalForm(): GoalFormState {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    color: goalColors[0],
    currentAmount: 0,
    deadline: nextYear.toISOString().slice(0, 10),
    icon: goalIcons[0],
    name: "",
    targetAmount: 0,
  };
}

function getDaysRemaining(deadline: string) {
  const diffTime =
    new Date(`${deadline}T00:00:00`).getTime() -
    new Date(`${getTodayValue()}T00:00:00`).getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMonthlyNeeded(goal: GoalOverviewItem) {
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const monthsRemaining = Math.max(
    1,
    Math.ceil(getDaysRemaining(goal.deadline) / 30),
  );
  return remaining / monthsRemaining;
}

function useGoalsScreenState(goals: GoalOverviewItem[]) {
  const [isPending, startTransition] = useTransition();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalFormState>(getInitialGoalForm);
  const [editingGoal, setEditingGoal] = useState<GoalOverviewItem | null>(null);
  const [fundingGoal, setFundingGoal] = useState<GoalOverviewItem | null>(null);
  const [fundAmount, setFundAmount] = useState(0);
  const [deletingGoal, setDeletingGoal] = useState<GoalOverviewItem | null>(
    null,
  );
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const overallProgress = totalTarget
    ? Math.round((totalCurrent / totalTarget) * 100)
    : 0;

  return {
    isPending,
    startTransition,
    isGoalDialogOpen,
    setIsGoalDialogOpen,
    goalForm,
    setGoalForm,
    editingGoal,
    setEditingGoal,
    fundingGoal,
    setFundingGoal,
    fundAmount,
    setFundAmount,
    deletingGoal,
    setDeletingGoal,
    totalTarget,
    totalCurrent,
    overallProgress,
  };
}

type GoalsScreenState = ReturnType<typeof useGoalsScreenState>;

type GoalHandlerActions = Pick<
  GoalsScreenProps,
  "addGoalFundsAction" | "createGoalAction" | "deleteGoalAction" | "updateGoalAction"
>;

function buildGoalSavePayload(goalForm: GoalFormState) {
  return {
    color: goalForm.color,
    currentAmount: goalForm.currentAmount,
    deadline: goalForm.deadline,
    icon: goalForm.icon,
    name: goalForm.name.trim(),
    targetAmount: goalForm.targetAmount,
  };
}

function useOpenGoalDialog(
  state: Pick<
    GoalsScreenState,
    "setGoalForm" | "setEditingGoal" | "setIsGoalDialogOpen"
  >,
) {
  const { setGoalForm, setEditingGoal, setIsGoalDialogOpen } = state;

  return (goal?: GoalOverviewItem) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        color: goal.color,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        icon: goal.icon,
        name: goal.name,
        targetAmount: goal.targetAmount,
      });
    } else {
      setEditingGoal(null);
      setGoalForm(getInitialGoalForm());
    }
    setIsGoalDialogOpen(true);
  };
}

function useGoalSaveHandlers({
  state,
  actions,
  t,
}: {
  state: GoalsScreenState;
  actions: Pick<GoalHandlerActions, "createGoalAction" | "updateGoalAction">;
  t: (key: string) => string;
}) {
  const router = useRouter();
  const {
    startTransition,
    goalForm,
    setGoalForm,
    editingGoal,
    setEditingGoal,
    setIsGoalDialogOpen,
  } = state;
  const openGoalDialog = useOpenGoalDialog(state);

  const handleSaveGoal = () => {
    if (!goalForm.name.trim() || goalForm.targetAmount <= 0) {
      toast.error(t("goals.validationError"));
      return;
    }

    startTransition(async () => {
      try {
        const payload = buildGoalSavePayload(goalForm);

        if (editingGoal) {
          await actions.updateGoalAction({ ...payload, id: editingGoal.id });
          toast.success(t("goals.updateSuccess"));
        } else {
          await actions.createGoalAction(payload);
          toast.success(t("goals.createSuccess"));
        }

        setIsGoalDialogOpen(false);
        setEditingGoal(null);
        setGoalForm(getInitialGoalForm());
        router.refresh();
      } catch (error) {
        console.error("Error saving goal:", error);
        toast.error(
          editingGoal ? t("goals.updateError") : t("goals.createError"),
        );
      }
    });
  };

  return { openGoalDialog, handleSaveGoal };
}

function useAddGoalFundsHandler({
  state,
  addGoalFundsAction,
  t,
}: {
  state: GoalsScreenState;
  addGoalFundsAction: GoalHandlerActions["addGoalFundsAction"];
  t: (key: string) => string;
}) {
  const router = useRouter();
  const { startTransition, fundingGoal, setFundingGoal, fundAmount, setFundAmount } =
    state;

  return () => {
    if (!fundingGoal) return;

    const amount = fundAmount;
    if (amount <= 0) {
      toast.error(t("goals.fundValidationError"));
      return;
    }

    startTransition(async () => {
      try {
        await addGoalFundsAction(fundingGoal.id, amount);
        toast.success(t("goals.fundSuccess"));
        setFundingGoal(null);
        setFundAmount(0);
        router.refresh();
      } catch (error) {
        console.error("Error adding goal funds:", error);
        toast.error(t("goals.fundError"));
      }
    });
  };
}

function useDeleteGoalHandler({
  state,
  deleteGoalAction,
  t,
}: {
  state: GoalsScreenState;
  deleteGoalAction: GoalHandlerActions["deleteGoalAction"];
  t: (key: string) => string;
}) {
  const router = useRouter();
  const { startTransition, deletingGoal, setDeletingGoal } = state;

  return () => {
    if (!deletingGoal) return;

    startTransition(async () => {
      try {
        await deleteGoalAction(deletingGoal.id);
        toast.success(t("goals.deleteSuccess"));
        setDeletingGoal(null);
        router.refresh();
      } catch (error) {
        console.error("Error deleting goal:", error);
        toast.error(t("goals.deleteError"));
      }
    });
  };
}

function useGoalFundsAndDeleteHandlers({
  state,
  actions,
  t,
}: {
  state: GoalsScreenState;
  actions: Pick<GoalHandlerActions, "addGoalFundsAction" | "deleteGoalAction">;
  t: (key: string) => string;
}) {
  const handleAddFunds = useAddGoalFundsHandler({
    state,
    addGoalFundsAction: actions.addGoalFundsAction,
    t,
  });
  const handleDeleteGoal = useDeleteGoalHandler({
    state,
    deleteGoalAction: actions.deleteGoalAction,
    t,
  });

  return { handleAddFunds, handleDeleteGoal };
}

function useGoalHandlers({
  state,
  actions,
  t,
}: {
  state: GoalsScreenState;
  actions: GoalHandlerActions;
  t: (key: string) => string;
}) {
  const { openGoalDialog, handleSaveGoal } = useGoalSaveHandlers({ state, actions, t });
  const { handleAddFunds, handleDeleteGoal } = useGoalFundsAndDeleteHandlers({
    state,
    actions,
    t,
  });

  return { openGoalDialog, handleSaveGoal, handleAddFunds, handleDeleteGoal };
}

type GoalsOverviewCardProps = {
  totalCurrent: number;
  totalTarget: number;
  overallProgress: number;
  goalsCount: number;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
};

function GoalsOverviewCard({
  totalCurrent,
  totalTarget,
  overallProgress,
  goalsCount,
  formatCurrency,
  t,
}: GoalsOverviewCardProps) {
  return (
    <Card className="mb-6 border-border bg-card card-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("screen.goals.overallProgress")}
            </p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {formatCurrency(totalCurrent)}{" "}
              <span className="text-lg font-normal text-muted-foreground">
                / {formatCurrency(totalTarget)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
              <p className="text-sm text-muted-foreground">{t("common.complete")}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{goalsCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("screen.goals.activeGoals")}
              </p>
            </div>
          </div>
        </div>
        <Progress value={overallProgress} className="mt-4 h-3" />
      </CardContent>
    </Card>
  );
}

type GoalCardCallbacks = {
  onEdit: (goal: GoalOverviewItem) => void;
  onDelete: (goal: GoalOverviewItem) => void;
  onAddFunds: (goal: GoalOverviewItem) => void;
};

function GoalCardMenu({
  goal,
  onEdit,
  onDelete,
  t,
}: {
  goal: GoalOverviewItem;
  onEdit: GoalCardCallbacks["onEdit"];
  onDelete: GoalCardCallbacks["onDelete"];
  t: (key: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(goal)}>
          <Pencil className="mr-2 size-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(goal)}>
          <Trash2 className="mr-2 size-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GoalCardHeader({
  goal,
  percentage,
  isOnTrack,
  onEdit,
  onDelete,
  t,
}: {
  goal: GoalOverviewItem;
  percentage: number;
  isOnTrack: boolean;
  onEdit: GoalCardCallbacks["onEdit"];
  onDelete: GoalCardCallbacks["onDelete"];
  t: (key: string) => string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className="flex size-14 items-center justify-center rounded-lg text-3xl"
          style={{ backgroundColor: `${goal.color}20` }}
        >
          {goal.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
          <Badge
            variant="secondary"
            className={cn(
              "mt-1 text-xs",
              isOnTrack ? "bg-income/20 text-income" : "bg-yellow/20 text-yellow",
            )}
          >
            {isOnTrack ? t("common.onTrack") : t("common.behind")}
          </Badge>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{percentage}%</p>
          <p className="text-xs text-muted-foreground">{t("common.complete")}</p>
        </div>
        <GoalCardMenu goal={goal} onEdit={onEdit} onDelete={onDelete} t={t} />
      </div>
    </div>
  );
}

function GoalCardStats({
  daysRemaining,
  isCloseToDeadline,
  monthlyNeeded,
  formatCurrency,
  t,
}: {
  daysRemaining: number;
  isCloseToDeadline: boolean;
  monthlyNeeded: number;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-2">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{t("screen.goals.deadline")}</p>
          <p
            className={cn(
              "text-sm font-medium",
              isCloseToDeadline ? "text-yellow" : "text-foreground",
            )}
          >
            {daysRemaining > 0
              ? `${daysRemaining}d ${t("common.left")}`
              : t("common.overdue")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">
            {t("screen.goals.monthlyNeeded")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(monthlyNeeded)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getGoalCardMetrics(goal: GoalOverviewItem) {
  const percentage = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100),
  );
  const daysRemaining = getDaysRemaining(goal.deadline);
  const monthlyNeeded = getMonthlyNeeded(goal);
  const isCloseToDeadline = daysRemaining < 90;
  const isOnTrack =
    percentage >= 100 - (Math.max(daysRemaining, 0) / 365) * 100;

  return { percentage, daysRemaining, monthlyNeeded, isCloseToDeadline, isOnTrack };
}

function GoalCardProgressRow({
  goal,
  percentage,
  formatCurrency,
  t,
}: {
  goal: GoalOverviewItem;
  percentage: number;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{t("screen.goals.progress")}</span>
        <span className="font-medium text-foreground">
          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
        </span>
      </div>
      <Progress value={percentage} className="h-3" />
    </div>
  );
}

function GoalCard(
  props: GoalCardCallbacks & {
    goal: GoalOverviewItem;
    formatCurrency: (value: number) => string;
    t: (key: string) => string;
  },
) {
  const { goal, onAddFunds, t } = props;
  const metrics = getGoalCardMetrics(goal);

  return (
    <Card className="overflow-hidden border-border bg-card card-shadow">
      <div className="h-2" style={{ backgroundColor: goal.color }} />
      <CardContent className="p-6">
        <GoalCardHeader {...props} {...metrics} />

        <div className="space-y-4">
          <GoalCardProgressRow {...props} {...metrics} />
          <GoalCardStats {...props} {...metrics} />

          <Button
            className="w-full"
            size="sm"
            style={{ backgroundColor: goal.color }}
            onClick={() => onAddFunds(goal)}
          >
            {t("common.addFunds")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsEmptyState({
  onCreate,
  t,
}: {
  onCreate: () => void;
  t: (key: string) => string;
}) {
  return (
    <Empty className="border border-border bg-card card-shadow">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Target className="size-6" />
        </EmptyMedia>
        <EmptyTitle>{t("goals.emptyTitle")}</EmptyTitle>
        <EmptyDescription>{t("goals.emptyDescription")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="gap-2" onClick={onCreate}>
          <Plus className="size-4" />
          {t("screen.goals.newGoal")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function GoalsList({
  goals,
  onEdit,
  onDelete,
  onAddFunds,
  onCreate,
  formatCurrency,
  t,
}: GoalCardCallbacks & {
  goals: GoalOverviewItem[];
  onCreate: () => void;
  formatCurrency: (value: number) => string;
  t: (key: string) => string;
}) {
  if (!goals.length) {
    return <GoalsEmptyState onCreate={onCreate} t={t} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddFunds={onAddFunds}
          formatCurrency={formatCurrency}
          t={t}
        />
      ))}
    </div>
  );
}

function GoalIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {goalIcons.map((icon) => (
        <button
          key={icon}
          type="button"
          className={cn(
            "flex size-9 items-center justify-center rounded-md border bg-background text-lg",
            value === icon ? "border-primary ring-2 ring-primary/40" : "border-border",
          )}
          onClick={() => onChange(icon)}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function GoalColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {goalColors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            "size-8 rounded-full border border-border",
            value === color && "ring-2 ring-ring ring-offset-2",
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={color}
        />
      ))}
    </div>
  );
}

type GoalFormFieldsProps = {
  goalForm: GoalFormState;
  setGoalForm: (form: GoalFormState) => void;
  t: (key: string) => string;
};

function GoalAmountFields({ goalForm, setGoalForm, t }: GoalFormFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <CurrencyInput
          id="goal-target"
          label={t("goals.targetAmount")}
          value={goalForm.targetAmount}
          onValueChange={(targetAmount) => setGoalForm({ ...goalForm, targetAmount })}
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
      <div className="space-y-2">
        <CurrencyInput
          id="goal-current"
          label={t("goals.currentAmount")}
          value={goalForm.currentAmount}
          onValueChange={(currentAmount) => setGoalForm({ ...goalForm, currentAmount })}
          labelClassName="normal-case tracking-normal text-foreground"
        />
      </div>
    </div>
  );
}

function GoalIconAndColorFields({ goalForm, setGoalForm, t }: GoalFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>{t("category.icon")}</Label>
        <GoalIconPicker
          value={goalForm.icon}
          onChange={(icon) => setGoalForm({ ...goalForm, icon })}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("goals.color")}</Label>
        <GoalColorPicker
          value={goalForm.color}
          onChange={(color) => setGoalForm({ ...goalForm, color })}
        />
      </div>
    </>
  );
}

function GoalFormFields({ goalForm, setGoalForm, t }: GoalFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goal-name">{t("common.name")}</Label>
        <Input
          id="goal-name"
          value={goalForm.name}
          onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
          placeholder={t("goals.namePlaceholder")}
        />
      </div>
      <GoalAmountFields goalForm={goalForm} setGoalForm={setGoalForm} t={t} />
      <div className="space-y-2">
        <Label htmlFor="goal-deadline">{t("screen.goals.deadline")}</Label>
        <Input
          id="goal-deadline"
          type="date"
          value={goalForm.deadline}
          onChange={(event) => setGoalForm({ ...goalForm, deadline: event.target.value })}
          className="w-full max-w-full min-w-0 appearance-none overflow-hidden pr-3 text-left [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:overflow-hidden [&::-webkit-date-and-time-value]:text-left"
        />
      </div>
      <GoalIconAndColorFields goalForm={goalForm} setGoalForm={setGoalForm} t={t} />
    </div>
  );
}

function GoalFormDialog({
  isOpen,
  onOpenChange,
  editingGoal,
  goalForm,
  setGoalForm,
  isPending,
  onSave,
  t,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal: GoalOverviewItem | null;
  goalForm: GoalFormState;
  setGoalForm: (form: GoalFormState) => void;
  isPending: boolean;
  onSave: () => void;
  t: (key: string) => string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto sm:h-[70vh] sm:w-[50vw] sm:max-w-none">
        <DialogHeader>
          <DialogTitle>
            {editingGoal ? t("screen.goals.editGoal") : t("screen.goals.newGoal")}
          </DialogTitle>
          <DialogDescription>{t("goals.formDescription")}</DialogDescription>
        </DialogHeader>
        <GoalFormFields goalForm={goalForm} setGoalForm={setGoalForm} t={t} />
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button disabled={isPending} onClick={onSave}>
            {isPending ? t("category.saving") : t("transaction.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFundsDialog({
  fundingGoal,
  onOpenChange,
  fundAmount,
  setFundAmount,
  isPending,
  onConfirm,
  t,
}: {
  fundingGoal: GoalOverviewItem | null;
  onOpenChange: (open: boolean) => void;
  fundAmount: number;
  setFundAmount: (amount: number) => void;
  isPending: boolean;
  onConfirm: () => void;
  t: (key: string) => string;
}) {
  return (
    <Dialog open={Boolean(fundingGoal)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.addFunds")}</DialogTitle>
          <DialogDescription>{fundingGoal?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <CurrencyInput
            id="goal-fund-amount"
            label={t("common.amount")}
            value={fundAmount}
            onValueChange={setFundAmount}
            labelClassName="normal-case tracking-normal text-foreground"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={isPending} onClick={onConfirm}>
            {t("common.addFunds")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGoalDialog({
  isOpen,
  onOpenChange,
  isPending,
  onConfirm,
  t,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
  t: (key: string) => string;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("goals.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("goals.deleteDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={onConfirm}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GoalFormDialogWrapper({
  state,
  handleSaveGoal,
  t,
}: {
  state: GoalsScreenState;
  handleSaveGoal: () => void;
  t: (key: string) => string;
}) {
  const { isPending, isGoalDialogOpen, setIsGoalDialogOpen, goalForm, setGoalForm, editingGoal, setEditingGoal } =
    state;

  return (
    <GoalFormDialog
      isOpen={isGoalDialogOpen}
      onOpenChange={(open) => {
        setIsGoalDialogOpen(open);
        if (!open) setEditingGoal(null);
      }}
      editingGoal={editingGoal}
      goalForm={goalForm}
      setGoalForm={setGoalForm}
      isPending={isPending}
      onSave={handleSaveGoal}
      t={t}
    />
  );
}

function GoalFundsAndDeleteDialogs({
  state,
  handleAddFunds,
  handleDeleteGoal,
  t,
}: {
  state: GoalsScreenState;
  handleAddFunds: () => void;
  handleDeleteGoal: () => void;
  t: (key: string) => string;
}) {
  const { isPending, fundingGoal, setFundingGoal, fundAmount, setFundAmount, deletingGoal, setDeletingGoal } =
    state;

  return (
    <>
      <AddFundsDialog
        fundingGoal={fundingGoal}
        onOpenChange={(open) => {
          if (!open) {
            setFundingGoal(null);
            setFundAmount(0);
          }
        }}
        fundAmount={fundAmount}
        setFundAmount={setFundAmount}
        isPending={isPending}
        onConfirm={handleAddFunds}
        t={t}
      />

      <DeleteGoalDialog
        isOpen={Boolean(deletingGoal)}
        onOpenChange={(open) => {
          if (!open) setDeletingGoal(null);
        }}
        isPending={isPending}
        onConfirm={handleDeleteGoal}
        t={t}
      />
    </>
  );
}

function GoalsScreenDialogs({
  state,
  handleSaveGoal,
  handleAddFunds,
  handleDeleteGoal,
  t,
}: {
  state: GoalsScreenState;
  handleSaveGoal: () => void;
  handleAddFunds: () => void;
  handleDeleteGoal: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <GoalFormDialogWrapper state={state} handleSaveGoal={handleSaveGoal} t={t} />
      <GoalFundsAndDeleteDialogs
        state={state}
        handleAddFunds={handleAddFunds}
        handleDeleteGoal={handleDeleteGoal}
        t={t}
      />
    </>
  );
}

function NewGoalHeaderAction({
  onCreate,
  t,
}: {
  onCreate: () => void;
  t: (key: string) => string;
}) {
  return (
    <Button className="gap-2 text-background" onClick={onCreate}>
      <Plus className="size-4" />
      {t("screen.goals.newGoal")}
    </Button>
  );
}

export function GoalsScreen(props: GoalsScreenProps) {
  const { goals } = props;
  const { formatCurrency, t } = useI18n();
  const state = useGoalsScreenState(goals);
  const { openGoalDialog, handleSaveGoal, handleAddFunds, handleDeleteGoal } =
    useGoalHandlers({ state, actions: props, t });
  const { setFundingGoal, setDeletingGoal, totalTarget, totalCurrent, overallProgress } =
    state;

  return (
    <>
      <PageHeader
        title={t("screen.goals.title")}
        description={t("screen.goals.description")}
        actions={<NewGoalHeaderAction onCreate={() => openGoalDialog()} t={t} />}
      />

      <GoalsOverviewCard
        totalCurrent={totalCurrent}
        totalTarget={totalTarget}
        overallProgress={overallProgress}
        goalsCount={goals.length}
        formatCurrency={formatCurrency}
        t={t}
      />

      <GoalsList
        goals={goals}
        onEdit={openGoalDialog}
        onDelete={setDeletingGoal}
        onAddFunds={setFundingGoal}
        onCreate={() => openGoalDialog()}
        formatCurrency={formatCurrency}
        t={t}
      />

      <GoalsScreenDialogs
        state={state}
        handleSaveGoal={handleSaveGoal}
        handleAddFunds={handleAddFunds}
        handleDeleteGoal={handleDeleteGoal}
        t={t}
      />
    </>
  );
}
