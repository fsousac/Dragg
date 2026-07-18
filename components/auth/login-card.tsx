/* v8 ignore file -- Browser Supabase auth interactions are covered through validation tests and production build checks. */
"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordRequirementsChecklist } from "@/components/auth/password-requirements-checklist";
import { TermsAcceptanceCheckbox } from "@/components/auth/terms-acceptance-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildSignUpUserMetadata,
  type EmailPasswordAuthMode,
  validateEmailPasswordAuth,
} from "@/lib/auth/email-password";
import { mapSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type AuthMode = EmailPasswordAuthMode;

function translateValidationErrors(
  errors: ReturnType<typeof validateEmailPasswordAuth>["errors"],
  t: (key: string) => string,
) {
  return {
    acceptedTerms: errors.acceptedTerms ? t(errors.acceptedTerms) : undefined,
    confirmPassword: errors.confirmPassword
      ? t(errors.confirmPassword)
      : undefined,
    email: errors.email ? t(errors.email) : undefined,
    firstName: errors.firstName ? t(errors.firstName) : undefined,
    lastName: errors.lastName ? t(errors.lastName) : undefined,
    password: errors.password ? t(errors.password) : undefined,
  };
}

function getModeCopy(mode: AuthMode) {
  if (mode === "signUp") {
    return {
      descriptionKey: "auth.signUpDescription" as const,
      titleKey: "auth.signUp" as const,
    };
  }

  if (mode === "reset") {
    return {
      descriptionKey: "auth.resetPasswordInstructions" as const,
      titleKey: "auth.resetPassword" as const,
    };
  }

  return {
    descriptionKey: "auth.signInDescription" as const,
    titleKey: "auth.signIn" as const,
  };
}

export function LoginCard() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{
    acceptedTerms?: string;
    confirmPassword?: string;
    email?: string;
    firstName?: string;
    form?: string;
    lastName?: string;
    password?: string;
  }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isResetMode = mode === "reset";
  const isSignUpMode = mode === "signUp";
  const modeCopy = getModeCopy(mode);
  const submitLabel =
    mode === "signUp"
      ? "auth.signUpWithEmail"
      : mode === "reset"
        ? "auth.resetPassword"
        : "auth.signInWithEmail";

  function updateMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setStatusMessage(null);
    setFirstName("");
    setLastName("");
    setPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);

    const validation = validateEmailPasswordAuth({
      acceptedTerms,
      confirmPassword,
      email,
      firstName,
      lastName,
      mode,
      password,
    });
    setErrors(translateValidationErrors(validation.errors, t));

    if (!validation.isValid) return;

    setIsLoading(true);
    const supabase = createClient();
    const normalizedEmail = email.trim();

    if (mode === "signIn") {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrors({ form: t(mapSupabaseAuthError(error, mode)) });
        setIsLoading(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
      return;
    }

    if (mode === "signUp") {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: buildSignUpUserMetadata(firstName, lastName),
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrors({ form: t(mapSupabaseAuthError(error, mode)) });
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setStatusMessage(t("auth.checkYourEmail"));
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      },
    );

    if (error) {
      setErrors({ form: t(mapSupabaseAuthError(error, mode)) });
      setIsLoading(false);
      return;
    }

    setStatusMessage(t("auth.checkYourEmail"));
    setIsLoading(false);
  }

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/88 p-6 shadow-2xl shadow-green-950/30 backdrop-blur md:p-8">
      <AuthCardHeader />

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-normal text-white">
          {t(modeCopy.titleKey)}
        </h1>
        <p className="text-sm leading-6 text-zinc-300">
          {t(modeCopy.descriptionKey)}
        </p>
      </div>

      {!isResetMode ? (
        <>
          <div className="my-7 grid grid-cols-4 gap-2" aria-hidden="true">
            <div className="h-1.5 rounded-full bg-primary" />
            <div className="h-1.5 rounded-full bg-orange-500" />
            <div className="h-1.5 rounded-full bg-pink-500" />
            <div className="h-1.5 rounded-full bg-purple-500" />
          </div>

          <GoogleLoginButton />

          <div className="my-5 flex items-center gap-3 text-xs uppercase text-zinc-500">
            <div className="h-px flex-1 bg-white/10" />
            <span>{t("auth.orContinueWithEmail")}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isSignUpMode ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="auth-first-name" className="text-zinc-200">
                {t("screen.settings.firstName")}
              </Label>
              <Input
                id="auth-first-name"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                className="h-11 border-white/10 bg-zinc-900/80 text-white"
                disabled={isLoading}
                onChange={(event) => setFirstName(event.target.value)}
                type="text"
                value={firstName}
              />
              {errors.firstName ? (
                <p className="text-sm text-red-300" role="alert">
                  {errors.firstName}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-last-name" className="text-zinc-200">
                {t("screen.settings.lastName")}
              </Label>
              <Input
                id="auth-last-name"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                className="h-11 border-white/10 bg-zinc-900/80 text-white"
                disabled={isLoading}
                onChange={(event) => setLastName(event.target.value)}
                type="text"
                value={lastName}
              />
              {errors.lastName ? (
                <p className="text-sm text-red-300" role="alert">
                  {errors.lastName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="auth-email" className="text-zinc-200">
            {t("auth.email")}
          </Label>
          <Input
            id="auth-email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="h-11 border-white/10 bg-zinc-900/80 text-white"
            disabled={isLoading}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          {errors.email ? (
            <p className="text-sm text-red-300" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        {!isResetMode ? (
          <>
            <PasswordField
              autoComplete={isSignUpMode ? "new-password" : "current-password"}
              disabled={isLoading}
              error={errors.password}
              id="auth-password"
              label={t("auth.password")}
              onChange={setPassword}
              value={password}
            />

            {isSignUpMode ? (
              <PasswordRequirementsChecklist password={password} />
            ) : null}

            {isSignUpMode ? (
              <PasswordField
                autoComplete="new-password"
                disabled={isLoading}
                error={errors.confirmPassword}
                id="auth-confirm-password"
                label={t("auth.confirmPassword")}
                onChange={setConfirmPassword}
                value={confirmPassword}
              />
            ) : null}

            {isSignUpMode ? (
              <TermsAcceptanceCheckbox
                checked={acceptedTerms}
                disabled={isLoading}
                error={errors.acceptedTerms}
                onCheckedChange={setAcceptedTerms}
              />
            ) : null}
          </>
        ) : null}

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
          {t(submitLabel)}
        </Button>
      </form>

      {statusMessage ? (
        <p className="mt-4 text-center text-sm text-zinc-300" role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-5 justify-around flex flex-row items-center gap-2 text-sm">
        {mode === "signIn" ? (
          <>
            <button
              className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
              onClick={() => updateMode("reset")}
              type="button"
            >
              {t("auth.forgotPassword")}
            </button>
            <button
              className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
              onClick={() => updateMode("signUp")}
              type="button"
            >
              {t("auth.createAccount")}
            </button>
          </>
        ) : (
          <button
            className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
            onClick={() => updateMode("signIn")}
            type="button"
          >
            {mode === "signUp"
              ? t("auth.alreadyHaveAccount")
              : t("auth.backToSignIn")}
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
        {t("auth.footer")}
      </p>
    </section>
  );
}
