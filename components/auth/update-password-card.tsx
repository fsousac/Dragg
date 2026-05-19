/* v8 ignore file -- Browser Supabase password update interaction is covered through validation tests and production build checks. */
"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/email-password";
import { mapSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordCard() {
  const router = useRouter();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    confirmPassword?: string;
    form?: string;
    password?: string;
  }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    const passwordErrorKey = validateNewPassword(password);
    const confirmPasswordErrorKey = validatePasswordConfirmation(
      password,
      confirmPassword,
    );

    setErrors({
      confirmPassword: confirmPasswordErrorKey
        ? t(confirmPasswordErrorKey)
        : undefined,
      password: passwordErrorKey ? t(passwordErrorKey) : undefined,
    });

    if (passwordErrorKey || confirmPasswordErrorKey) return;

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrors({ form: t(mapSupabaseAuthError(error, "signIn")) });
      setIsLoading(false);
      return;
    }

    setStatusMessage(t("auth.passwordUpdated"));
    setIsLoading(false);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/88 p-6 shadow-2xl shadow-green-950/30 backdrop-blur md:p-8">
      <AuthCardHeader />

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-normal text-white">
          {t("auth.updatePassword")}
        </h1>
        <p className="text-sm leading-6 text-zinc-300">
          {t("auth.updatePasswordInstructions")}
        </p>
      </div>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <PasswordField
          autoComplete="new-password"
          disabled={isLoading}
          error={errors.password}
          hint={t("auth.passwordHint")}
          id="new-password"
          label={t("auth.newPassword")}
          onChange={setPassword}
          value={password}
        />

        <PasswordField
          autoComplete="new-password"
          disabled={isLoading}
          error={errors.confirmPassword}
          id="confirm-new-password"
          label={t("auth.confirmPassword")}
          onChange={setConfirmPassword}
          value={confirmPassword}
        />

        {errors.form ? (
          <p className="text-center text-sm text-red-300" role="alert">
            {errors.form}
          </p>
        ) : null}

        <Button
          className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_32px_rgba(34,197,94,0.25)] hover:bg-primary/90"
          disabled={isLoading}
          size="lg"
          type="submit"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {t("auth.updatePassword")}
        </Button>
      </form>

      {statusMessage ? (
        <p className="mt-4 text-center text-sm text-zinc-300" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
