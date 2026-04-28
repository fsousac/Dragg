"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { Plus } from "lucide-react"

export function NewTransactionCTA() {
  const { t } = useI18n()

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40">
      <Button
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 rounded-full gap-2 px-6"
      >
        <Plus className="w-5 h-5" />
        <span className="hidden lg:inline">{t("dashboard.newTransaction")}</span>
      </Button>
    </div>
  )
}
