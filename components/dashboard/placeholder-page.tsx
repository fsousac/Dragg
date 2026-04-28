"use client"

import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Folder,
  MoreHorizontal,
  PieChart,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react"
import { useI18n } from "@/lib/i18n"

const icons = {
  budgets: PieChart,
  categories: Folder,
  goals: Target,
  more: MoreHorizontal,
  payments: CreditCard,
  reports: BarChart3,
  settings: Settings,
  transactions: ArrowLeftRight,
} satisfies Record<string, LucideIcon>

interface PlaceholderPageProps {
  descriptionKey: string
  icon: keyof typeof icons
  titleKey: string
}

export function PlaceholderPage({
  descriptionKey,
  icon,
  titleKey,
}: PlaceholderPageProps) {
  const { t } = useI18n()
  const Icon = icons[icon]

  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-medium uppercase text-primary">
          {t("common.comingSoon")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          {t(titleKey)}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t(descriptionKey)}
        </p>
      </div>
    </section>
  )
}
