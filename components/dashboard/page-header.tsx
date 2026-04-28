"use client"

import type { ReactNode } from "react"

interface PageHeaderProps {
  actions?: ReactNode
  description: string
  title: string
}

export function PageHeader({ actions, description, title }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  )
}

