import type { EmailPasswordAuthMode } from "@/lib/auth/email-password";

type SupabaseAuthErrorLike = {
  code?: string;
  message?: string;
};

type AuthErrorRule = {
  result: string;
  test: (code: string, message: string) => boolean;
};

const authErrorRules: AuthErrorRule[] = [
  {
    result: "auth.emailAlreadyRegistered",
    test: (code, message) =>
      code === "user_already_exists" ||
      code === "email_exists" ||
      message.includes("already registered") ||
      message.includes("already been registered"),
  },
  {
    result: "auth.weakPassword",
    test: (code, message) =>
      code === "weak_password" || message.includes("weak password"),
  },
  {
    result: "auth.signUpDisabled",
    test: (code) => code === "signup_disabled",
  },
  {
    result: "auth.rateLimitError",
    test: (code) =>
      code === "over_email_send_rate_limit" ||
      code === "over_request_rate_limit",
  },
  {
    result: "auth.redirectNotAllowed",
    test: (code, message) =>
      message.includes("redirect") ||
      message.includes("redirect_to") ||
      code === "validation_failed",
  },
  {
    result: "auth.invalidEmail",
    test: (code, message) =>
      code === "email_address_invalid" || message.includes("invalid email"),
  },
];

function matchKnownAuthError(code: string, message: string) {
  return authErrorRules.find((rule) => rule.test(code, message))?.result;
}

function defaultAuthErrorForMode(mode: EmailPasswordAuthMode) {
  if (mode === "signIn") {
    return "auth.invalidCredentials";
  }

  if (mode === "signUp") {
    return "auth.signUpError";
  }

  return "auth.resetPasswordError";
}

export function mapSupabaseAuthError(
  error: SupabaseAuthErrorLike,
  mode: EmailPasswordAuthMode,
): string {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  return matchKnownAuthError(code, message) ?? defaultAuthErrorForMode(mode);
}
