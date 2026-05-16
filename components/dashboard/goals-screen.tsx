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
  currentAmount: string;
  deadline: string;
  icon: string;
  name: string;
  targetAmount: string;
};

const goalIcons = ["🎯", "🏦", "✈️", "🚗", "🏠", "📈", "🎓", "💻"];
const goalColors = [
  "#22C55E",
  "#15803D",
  "#F6C453",
  "#FFC38A",
  "#14B8A6",
  "#EAB308",
];

function sanitizeCurrencyInput(value: string) {
  const normalizedSeparator = value.replace(/\./g, ",");
  const sanitizedValue = normalizedSeparator.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = sanitizedValue.split(",");

  return decimalParts.length
    ? `${integerPart},${decimalParts.join("")}`
    : integerPart;
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function formatCurrencyInput(value: number) {
  return value ? value.toFixed(2).replace(".", ",") : "";
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialGoalForm(): GoalFormState {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return {
    color: goalColors[0],
    currentAmount: "",
    deadline: nextYear.toISOString().slice(0, 10),
    icon: goalIcons[0],
    name: "",
    targetAmount: "",
  };
}

export function GoalsScreen({
  addGoalFundsAction,
  createGoalAction,
  deleteGoalAction,
  goals,
  updateGoalAction,
}: GoalsScreenProps) {
  const router = useRouter();
  const { formatCurrency, t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalFormState>(getInitialGoalForm);
  const [editingGoal, setEditingGoal] = useState<GoalOverviewItem | null>(null);
  const [fundingGoal, setFundingGoal] = useState<GoalOverviewItem | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [deletingGoal, setDeletingGoal] = useState<GoalOverviewItem | null>(
    null,
  );
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const overallProgress = totalTarget
    ? Math.round((totalCurrent / totalTarget) * 100)
    : 0;

  const getDaysRemaining = (deadline: string) => {
    const diffTime =
      new Date(`${deadline}T00:00:00`).getTime() -
      new Date(`${getTodayValue()}T00:00:00`).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getMonthlyNeeded = (goal: GoalOverviewItem) => {
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const monthsRemaining = Math.max(
      1,
      Math.ceil(getDaysRemaining(goal.deadline) / 30),
    );
    return remaining / monthsRemaining;
  };

  const openGoalDialog = (goal?: GoalOverviewItem) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        color: goal.color,
        currentAmount: formatCurrencyInput(goal.currentAmount),
        deadline: goal.deadline,
        icon: goal.icon,
        name: goal.name,
        targetAmount: formatCurrencyInput(goal.targetAmount),
      });
    } else {
      setEditingGoal(null);
      setGoalForm(getInitialGoalForm());
    }
    setIsGoalDialogOpen(true);
  };

  const handleSaveGoal = () => {
    const targetAmount = parseCurrencyInput(goalForm.targetAmount);
    const currentAmount = parseCurrencyInput(goalForm.currentAmount);

    if (!goalForm.name.trim() || targetAmount <= 0) {
      toast.error(t("goals.validationError"));
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          color: goalForm.color,
          currentAmount,
          deadline: goalForm.deadline,
          icon: goalForm.icon,
          name: goalForm.name.trim(),
          targetAmount,
        };

        if (editingGoal) {
          await updateGoalAction({ ...payload, id: editingGoal.id });
          toast.success(t("goals.updateSuccess"));
        } else {
          await createGoalAction(payload);
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

  const handleAddFunds = () => {
    if (!fundingGoal) return;

    const amount = parseCurrencyInput(fundAmount);
    if (amount <= 0) {
      toast.error(t("goals.fundValidationError"));
      return;
    }

    startTransition(async () => {
      try {
        await addGoalFundsAction(fundingGoal.id, amount);
        toast.success(t("goals.fundSuccess"));
        setFundingGoal(null);
        setFundAmount("");
        router.refresh();
      } catch (error) {
        console.error("Error adding goal funds:", error);
        toast.error(t("goals.fundError"));
      }
    });
  };

  const handleDeleteGoal = () => {
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

  return (
    <>
      <PageHeader
        title={t("screen.goals.title")}
        description={t("screen.goals.description")}
        actions={
          <Button className="gap-2" onClick={() => openGoalDialog()}>
            <Plus className="size-4" />
            {t("screen.goals.newGoal")}
          </Button>
        }
      />

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
                <p className="text-3xl font-bold text-primary">
                  {overallProgress}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("common.complete")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">
                  {goals.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("screen.goals.activeGoals")}
                </p>
              </div>
            </div>
          </div>
          <Progress value={overallProgress} className="mt-4 h-3" />
        </CardContent>
      </Card>

      {goals.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {goals.map((goal) => {
            const percentage = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100),
            );
            const daysRemaining = getDaysRemaining(goal.deadline);
            const monthlyNeeded = getMonthlyNeeded(goal);
            const isCloseToDeadline = daysRemaining < 90;
            const isOnTrack =
              percentage >= 100 - (Math.max(daysRemaining, 0) / 365) * 100;

            return (
              <Card
                key={goal.id}
                className="overflow-hidden border-border bg-card card-shadow"
              >
                <div className="h-2" style={{ backgroundColor: goal.color }} />
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-14 items-center justify-center rounded-lg text-3xl"
                        style={{ backgroundColor: `${goal.color}20` }}
                      >
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {goal.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "mt-1 text-xs",
                            isOnTrack
                              ? "bg-income/20 text-income"
                              : "bg-yellow/20 text-yellow",
                          )}
                        >
                          {isOnTrack ? t("common.onTrack") : t("common.behind")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          {percentage}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("common.complete")}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openGoalDialog(goal)}>
                            <Pencil className="mr-2 size-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingGoal(goal)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("screen.goals.progress")}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(goal.currentAmount)} /{" "}
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("screen.goals.deadline")}
                          </p>
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

                    <Button
                      className="w-full"
                      size="sm"
                      style={{ backgroundColor: goal.color }}
                      onClick={() => setFundingGoal(goal)}
                    >
                      {t("common.addFunds")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="border border-border bg-card card-shadow">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t("goals.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("goals.emptyDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="gap-2" onClick={() => openGoalDialog()}>
              <Plus className="size-4" />
              {t("screen.goals.newGoal")}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <Dialog
        open={isGoalDialogOpen}
        onOpenChange={(open) => {
          setIsGoalDialogOpen(open);
          if (!open) setEditingGoal(null);
        }}
      >
        <DialogContent className="overflow-y-auto sm:h-[70vh] sm:w-[50vw] sm:max-w-none">
          <DialogHeader>
            <DialogTitle>
              {editingGoal
                ? t("screen.goals.editGoal")
                : t("screen.goals.newGoal")}
            </DialogTitle>
            <DialogDescription>{t("goals.formDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">{t("common.name")}</Label>
              <Input
                id="goal-name"
                value={goalForm.name}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, name: event.target.value })
                }
                placeholder={t("goals.namePlaceholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goal-target">{t("goals.targetAmount")}</Label>
                <Input
                  id="goal-target"
                  inputMode="decimal"
                  value={goalForm.targetAmount}
                  onChange={(event) =>
                    setGoalForm({
                      ...goalForm,
                      targetAmount: sanitizeCurrencyInput(event.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-current">{t("goals.currentAmount")}</Label>
                <Input
                  id="goal-current"
                  inputMode="decimal"
                  value={goalForm.currentAmount}
                  onChange={(event) =>
                    setGoalForm({
                      ...goalForm,
                      currentAmount: sanitizeCurrencyInput(event.target.value),
                    })
                  }
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">
                {t("screen.goals.deadline")}
              </Label>
              <Input
                id="goal-deadline"
                type="date"
                value={goalForm.deadline}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, deadline: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("category.icon")}</Label>
              <div className="flex flex-wrap gap-2">
                {goalIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md border bg-background text-lg",
                      goalForm.icon === icon
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border",
                    )}
                    onClick={() => setGoalForm({ ...goalForm, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("goals.color")}</Label>
              <div className="flex flex-wrap gap-2">
                {goalColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "size-8 rounded-full border border-border",
                      goalForm.color === color && "ring-2 ring-ring ring-offset-2",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setGoalForm({ ...goalForm, color })}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setIsGoalDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button disabled={isPending} onClick={handleSaveGoal}>
              {isPending ? t("category.saving") : t("transaction.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(fundingGoal)}
        onOpenChange={(open) => {
          if (!open) {
            setFundingGoal(null);
            setFundAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.addFunds")}</DialogTitle>
            <DialogDescription>{fundingGoal?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="goal-fund-amount">{t("common.amount")}</Label>
            <Input
              id="goal-fund-amount"
              inputMode="decimal"
              value={fundAmount}
              onChange={(event) =>
                setFundAmount(sanitizeCurrencyInput(event.target.value))
              }
              placeholder="0,00"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setFundingGoal(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button disabled={isPending} onClick={handleAddFunds}>
              {t("common.addFunds")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingGoal)}
        onOpenChange={(open) => {
          if (!open) setDeletingGoal(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("goals.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("goals.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={handleDeleteGoal}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
