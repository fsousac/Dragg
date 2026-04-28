import { redirect } from "next/navigation"

import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(236,72,153,0.14),transparent_24%),radial-gradient(circle_at_50%_88%,rgba(249,115,22,0.12),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-green-400/60 to-transparent" />

        <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/88 p-6 shadow-2xl shadow-green-950/30 backdrop-blur md:p-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary text-lg font-black text-primary-foreground shadow-[0_0_28px_rgba(34,197,94,0.35)]">
              D
            </div>
            <div>
              <p className="text-2xl font-bold leading-none tracking-normal">
                Dragg
              </p>
              <p className="mt-1 text-xs font-medium uppercase text-green-300">
                Personal finance clarity
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-normal text-white">
              Simple money tracking for everyday decisions.
            </h1>
            <p className="text-sm leading-6 text-zinc-300">
              Track your money, budgets, and goals with a simple open-source
              finance dashboard.
            </p>
          </div>

          <div className="my-7 grid grid-cols-4 gap-2" aria-hidden="true">
            <div className="h-1.5 rounded-full bg-primary" />
            <div className="h-1.5 rounded-full bg-orange-500" />
            <div className="h-1.5 rounded-full bg-pink-500" />
            <div className="h-1.5 rounded-full bg-purple-500" />
          </div>

          <GoogleLoginButton />

          <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
            Open source. Free to run. Built for personal finance clarity.
          </p>
        </section>
      </div>
    </main>
  )
}
