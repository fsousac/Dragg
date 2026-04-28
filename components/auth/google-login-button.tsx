"use client"

import { Chrome, Loader2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n"

export function GoogleLoginButton() {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signInError) {
      setError(signInError.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_32px_rgba(34,197,94,0.25)] hover:bg-primary/90"
        disabled={isLoading}
        onClick={handleLogin}
        size="lg"
        type="button"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Chrome className="size-4" aria-hidden="true" />
        )}
        {t("auth.continueWithGoogle")}
      </Button>

      {error ? (
        <p className="text-center text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
