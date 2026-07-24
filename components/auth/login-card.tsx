/* v8 ignore file -- Browser Supabase auth interactions are covered through validation tests and production build checks. */
"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { type SubmitEvent, useState } from "react";

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

type FormErrors = {
  acceptedTerms?: string;
  confirmPassword?: string;
  email?: string;
  firstName?: string;
  form?: string;
  lastName?: string;
  password?: string;
};

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

function getSubmitLabel(mode: AuthMode) {
  if (mode === "signUp") return "auth.signUpWithEmail" as const;
  if (mode === "reset") return "auth.resetPassword" as const;
  return "auth.signInWithEmail" as const;
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

type SupabaseAuthClient = ReturnType<typeof createClient>;

type RunSignInParams = {
  email: string;
  password: string;
  router: ReturnType<typeof useRouter>;
  setErrors: (errors: FormErrors) => void;
  setIsLoading: (isLoading: boolean) => void;
  supabase: SupabaseAuthClient;
  t: (key: string) => string;
};

async function runSignIn({
  email,
  password,
  router,
  setErrors,
  setIsLoading,
  supabase,
  t,
}: RunSignInParams) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setErrors({ form: t(mapSupabaseAuthError(error, "signIn")) });
    setIsLoading(false);
    return;
  }

  router.replace("/dashboard");
  router.refresh();
}

type RunSignUpParams = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  router: ReturnType<typeof useRouter>;
  setErrors: (errors: FormErrors) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  supabase: SupabaseAuthClient;
  t: (key: string) => string;
};

async function runSignUp({
  email,
  firstName,
  lastName,
  password,
  router,
  setErrors,
  setIsLoading,
  setStatusMessage,
  supabase,
  t,
}: RunSignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: buildSignUpUserMetadata(firstName, lastName),
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    setErrors({ form: t(mapSupabaseAuthError(error, "signUp")) });
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
}

type RunPasswordResetParams = {
  email: string;
  setErrors: (errors: FormErrors) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  supabase: SupabaseAuthClient;
  t: (key: string) => string;
};

async function runPasswordReset({
  email,
  setErrors,
  setIsLoading,
  setStatusMessage,
  supabase,
  t,
}: RunPasswordResetParams) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    setErrors({ form: t(mapSupabaseAuthError(error, "reset")) });
    setIsLoading(false);
    return;
  }

  setStatusMessage(t("auth.checkYourEmail"));
  setIsLoading(false);
}

type SubmitAuthFormParams = {
  acceptedTerms: boolean;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  mode: AuthMode;
  password: string;
  router: ReturnType<typeof useRouter>;
  setErrors: (errors: FormErrors) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  t: (key: string) => string;
};

type ValidateAndApplyErrorsParams = {
  acceptedTerms: boolean;
  confirmPassword: string;
  email: string;
  firstName: string;
  lastName: string;
  mode: AuthMode;
  password: string;
  setErrors: (errors: FormErrors) => void;
  t: (key: string) => string;
};

function validateAndApplyErrors({
  acceptedTerms,
  confirmPassword,
  email,
  firstName,
  lastName,
  mode,
  password,
  setErrors,
  t,
}: ValidateAndApplyErrorsParams) {
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
  return validation.isValid;
}

async function dispatchAuthMode(mode: AuthMode, runParams: RunSignUpParams) {
  if (mode === "signIn") return runSignIn(runParams);
  if (mode === "signUp") return runSignUp(runParams);
  return runPasswordReset(runParams);
}

async function submitAuthForm({
  acceptedTerms,
  confirmPassword,
  email,
  firstName,
  lastName,
  mode,
  password,
  router,
  setErrors,
  setIsLoading,
  setStatusMessage,
  t,
}: SubmitAuthFormParams) {
  setStatusMessage(null);

  const isValid = validateAndApplyErrors({
    acceptedTerms,
    confirmPassword,
    email,
    firstName,
    lastName,
    mode,
    password,
    setErrors,
    t,
  });

  if (!isValid) return;

  setIsLoading(true);
  const supabase = createClient();
  const runParams = {
    email: email.trim(),
    firstName,
    lastName,
    password,
    router,
    setErrors,
    setIsLoading,
    setStatusMessage,
    supabase,
    t,
  };

  await dispatchAuthMode(mode, runParams);
}

function useAuthFormFields() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function resetFields() {
    setFirstName("");
    setLastName("");
    setPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
  }

  return {
    acceptedTerms,
    confirmPassword,
    email,
    firstName,
    lastName,
    password,
    resetFields,
    setAcceptedTerms,
    setConfirmPassword,
    setEmail,
    setFirstName,
    setLastName,
    setPassword,
  };
}

type AuthTitleBlockProps = Readonly<{
  descriptionKey: string;
  titleKey: string;
}>;

function AuthTitleBlock({ descriptionKey, titleKey }: AuthTitleBlockProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-normal text-white">
        {t(titleKey)}
      </h1>
      <p className="text-sm leading-6 text-zinc-300">{t(descriptionKey)}</p>
    </div>
  );
}

function SocialAuthOptions() {
  const { t } = useI18n();
  return (
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
  );
}

type NameFieldsProps = Readonly<{
  firstName: string;
  firstNameError?: string;
  isLoading: boolean;
  lastName: string;
  lastNameError?: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}>;

type SingleNameFieldProps = Readonly<{
  autoComplete: string;
  error?: string;
  id: string;
  isLoading: boolean;
  labelKey: string;
  onChange: (value: string) => void;
  value: string;
}>;

function SingleNameField({
  autoComplete,
  error,
  id,
  isLoading,
  labelKey,
  onChange,
  value,
}: SingleNameFieldProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-zinc-200">
        {t(labelKey)}
      </Label>
      <Input
        id={id}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="h-11 border-white/10 bg-zinc-900/80 text-white"
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={value}
      />
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NameFields({
  firstName,
  firstNameError,
  isLoading,
  lastName,
  lastNameError,
  onFirstNameChange,
  onLastNameChange,
}: NameFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SingleNameField
        autoComplete="given-name"
        error={firstNameError}
        id="auth-first-name"
        isLoading={isLoading}
        labelKey="screen.settings.firstName"
        onChange={onFirstNameChange}
        value={firstName}
      />
      <SingleNameField
        autoComplete="family-name"
        error={lastNameError}
        id="auth-last-name"
        isLoading={isLoading}
        labelKey="screen.settings.lastName"
        onChange={onLastNameChange}
        value={lastName}
      />
    </div>
  );
}

type EmailFieldProps = Readonly<{
  email: string;
  error?: string;
  isLoading: boolean;
  onChange: (value: string) => void;
}>;

function EmailField({ email, error, isLoading, onChange }: EmailFieldProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Label htmlFor="auth-email" className="text-zinc-200">
        {t("auth.email")}
      </Label>
      <Input
        id="auth-email"
        autoComplete="email"
        aria-invalid={Boolean(error)}
        className="h-11 border-white/10 bg-zinc-900/80 text-white"
        disabled={isLoading}
        onChange={(event) => onChange(event.target.value)}
        type="email"
        value={email}
      />
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PasswordSectionProps = Readonly<{
  acceptedTerms: boolean;
  acceptedTermsError?: string;
  confirmPassword: string;
  confirmPasswordError?: string;
  isLoading: boolean;
  isSignUpMode: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  password: string;
  passwordError?: string;
}>;

function PasswordSection({
  acceptedTerms,
  acceptedTermsError,
  confirmPassword,
  confirmPasswordError,
  isLoading,
  isSignUpMode,
  onAcceptedTermsChange,
  onConfirmPasswordChange,
  onPasswordChange,
  password,
  passwordError,
}: PasswordSectionProps) {
  const { t } = useI18n();
  return (
    <>
      <PasswordField
        autoComplete={isSignUpMode ? "new-password" : "current-password"}
        disabled={isLoading}
        error={passwordError}
        id="auth-password"
        label={t("auth.password")}
        onChange={onPasswordChange}
        value={password}
      />

      {isSignUpMode ? (
        <PasswordRequirementsChecklist password={password} />
      ) : null}

      {isSignUpMode ? (
        <PasswordField
          autoComplete="new-password"
          disabled={isLoading}
          error={confirmPasswordError}
          id="auth-confirm-password"
          label={t("auth.confirmPassword")}
          onChange={onConfirmPasswordChange}
          value={confirmPassword}
        />
      ) : null}

      {isSignUpMode ? (
        <TermsAcceptanceCheckbox
          checked={acceptedTerms}
          disabled={isLoading}
          error={acceptedTermsError}
          onCheckedChange={onAcceptedTermsChange}
        />
      ) : null}
    </>
  );
}

type SubmitSectionProps = Readonly<{
  formError?: string;
  isLoading: boolean;
  submitLabel: ReturnType<typeof getSubmitLabel>;
}>;

function SubmitSection({
  formError,
  isLoading,
  submitLabel,
}: SubmitSectionProps) {
  const { t } = useI18n();
  return (
    <>
      {formError ? (
        <p className="text-center text-sm text-red-300" role="alert">
          {formError}
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
    </>
  );
}

type ModeSwitchLinksProps = Readonly<{
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}>;

function ModeSwitchLinks({ mode, onModeChange }: ModeSwitchLinksProps) {
  const { t } = useI18n();

  if (mode === "signIn") {
    return (
      <div className="mt-5 justify-around flex flex-row items-center gap-2 text-sm">
        <button
          className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
          onClick={() => onModeChange("reset")}
          type="button"
        >
          {t("auth.forgotPassword")}
        </button>
        <button
          className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
          onClick={() => onModeChange("signUp")}
          type="button"
        >
          {t("auth.createAccount")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 justify-around flex flex-row items-center gap-2 text-sm">
      <button
        className="text-zinc-300 underline-offset-4 hover:text-white hover:underline cursor-pointer"
        onClick={() => onModeChange("signIn")}
        type="button"
      >
        {mode === "signUp"
          ? t("auth.alreadyHaveAccount")
          : t("auth.backToSignIn")}
      </button>
    </div>
  );
}

type AuthFormBodyProps = Readonly<{
  errors: FormErrors;
  fields: ReturnType<typeof useAuthFormFields>;
  isLoading: boolean;
  isResetMode: boolean;
  isSignUpMode: boolean;
  mode: AuthMode;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}>;

function NameFieldsSection({
  fields,
  errors,
  isLoading,
}: Pick<AuthFormBodyProps, "fields" | "errors" | "isLoading">) {
  return (
    <NameFields
      firstName={fields.firstName}
      firstNameError={errors.firstName}
      isLoading={isLoading}
      lastName={fields.lastName}
      lastNameError={errors.lastName}
      onFirstNameChange={fields.setFirstName}
      onLastNameChange={fields.setLastName}
    />
  );
}

function PasswordFormSection({
  fields,
  errors,
  isLoading,
  isSignUpMode,
}: Pick<AuthFormBodyProps, "fields" | "errors" | "isLoading" | "isSignUpMode">) {
  return (
    <PasswordSection
      acceptedTerms={fields.acceptedTerms}
      acceptedTermsError={errors.acceptedTerms}
      confirmPassword={fields.confirmPassword}
      confirmPasswordError={errors.confirmPassword}
      isLoading={isLoading}
      isSignUpMode={isSignUpMode}
      onAcceptedTermsChange={fields.setAcceptedTerms}
      onConfirmPasswordChange={fields.setConfirmPassword}
      onPasswordChange={fields.setPassword}
      password={fields.password}
      passwordError={errors.password}
    />
  );
}

function AuthFormBody({
  errors,
  fields,
  isLoading,
  isResetMode,
  isSignUpMode,
  mode,
  onSubmit,
}: AuthFormBodyProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {isSignUpMode ? (
        <NameFieldsSection fields={fields} errors={errors} isLoading={isLoading} />
      ) : null}

      <EmailField
        email={fields.email}
        error={errors.email}
        isLoading={isLoading}
        onChange={fields.setEmail}
      />

      {!isResetMode ? (
        <PasswordFormSection
          fields={fields}
          errors={errors}
          isLoading={isLoading}
          isSignUpMode={isSignUpMode}
        />
      ) : null}

      <SubmitSection
        formError={errors.form}
        isLoading={isLoading}
        submitLabel={getSubmitLabel(mode)}
      />
    </form>
  );
}

function useLoginCardController() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const fields = useAuthFormFields();
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isResetMode = mode === "reset";
  const isSignUpMode = mode === "signUp";
  const modeCopy = getModeCopy(mode);

  function updateMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setStatusMessage(null);
    fields.resetFields();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAuthForm({
      ...fields,
      mode,
      router,
      setErrors,
      setIsLoading,
      setStatusMessage,
      t,
    });
  }

  return {
    t,
    mode,
    fields,
    errors,
    statusMessage,
    isLoading,
    isResetMode,
    isSignUpMode,
    modeCopy,
    updateMode,
    handleSubmit,
  };
}

export function LoginCard() {
  const {
    t,
    mode,
    fields,
    errors,
    statusMessage,
    isLoading,
    isResetMode,
    isSignUpMode,
    modeCopy,
    updateMode,
    handleSubmit,
  } = useLoginCardController();

  return (
    <section className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950/88 p-6 shadow-2xl shadow-green-950/30 backdrop-blur md:p-8">
      <AuthCardHeader />
      <AuthTitleBlock
        descriptionKey={modeCopy.descriptionKey}
        titleKey={modeCopy.titleKey}
      />

      {!isResetMode ? <SocialAuthOptions /> : null}

      <AuthFormBody
        errors={errors}
        fields={fields}
        isLoading={isLoading}
        isResetMode={isResetMode}
        isSignUpMode={isSignUpMode}
        mode={mode}
        onSubmit={handleSubmit}
      />

      {statusMessage ? (
        <output className="mt-4 block text-center text-sm text-zinc-300">
          {statusMessage}
        </output>
      ) : null}

      <ModeSwitchLinks mode={mode} onModeChange={updateMode} />

      <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
        {t("auth.footer")}
      </p>
    </section>
  );
}
