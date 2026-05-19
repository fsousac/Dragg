import type { EmailPasswordAuthMode } from "@/lib/auth/email-password";

type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
};

export function mapSupabaseAuthError(
  error: SupabaseAuthErrorLike,
  mode: EmailPasswordAuthMode,
): string {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "auth.emailAlreadyRegistered";
  }

  if (code === "weak_password" || message.includes("weak password")) {
    return "auth.weakPassword";
  }

  if (code === "signup_disabled") {
    return "auth.signUpDisabled";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "auth.rateLimitError";
  }

  if (
    message.includes("redirect") ||
    message.includes("redirect_to") ||
    code === "validation_failed"
  ) {
    return "auth.redirectNotAllowed";
  }

  if (code === "email_address_invalid" || message.includes("invalid email")) {
    return "auth.invalidEmail";
  }

  if (mode === "signIn") {
    return "auth.invalidCredentials";
  }

  if (mode === "signUp") {
    return "auth.signUpError";
  }

  return "auth.resetPasswordError";
}
