import type { LucideIcon } from "lucide-react"

interface PlaceholderPageProps {
  description: string
  icon: LucideIcon
  title: string
}

export function PlaceholderPage({
  description,
  icon: Icon,
  title,
}: PlaceholderPageProps) {
  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-medium uppercase text-primary">
          Coming soon
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  )
}
