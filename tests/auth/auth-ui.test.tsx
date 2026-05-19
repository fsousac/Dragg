import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginCard } from "@/components/auth/login-card";
import { PasswordRequirementsChecklist } from "@/components/auth/password-requirements-checklist";
import { UpdatePasswordCard } from "@/components/auth/update-password-card";

const translations: Record<string, string> = {
  "auth.backToSignIn": "Back to sign in",
  "auth.checkYourEmail": "Check your email",
  "auth.confirmPassword": "Confirm password",
  "auth.continueWithGoogle": "Continue with Google",
  "auth.createAccount": "Create account",
  "auth.email": "Email",
  "auth.footer": "Open source.",
  "auth.forgotPassword": "Forgot password?",
  "auth.kicker": "Personal finance clarity",
  "auth.newPassword": "New password",
  "auth.orContinueWithEmail": "or continue with email",
  "auth.password": "Password",
  "auth.passwordRequirementsTitle": "Your password must include:",
  "auth.passwordRequirementMinLength": "At least 8 characters",
  "auth.passwordRequirementLowercase": "One lowercase letter",
  "auth.passwordRequirementUppercase": "One uppercase letter",
  "auth.passwordRequirementNumber": "One number",
  "auth.passwordRequirementSymbol": "One symbol",
  "auth.resetPasswordInstructions": "Enter your email for reset instructions.",
  "auth.signIn": "Sign in",
  "auth.signInDescription": "Sign in with Google or your email and password.",
  "auth.signInWithEmail": "Sign in with email",
  "auth.signUp": "Sign up",
  "auth.signUpDescription": "Create an account with your name, email, and password.",
  "screen.settings.firstName": "First Name",
  "screen.settings.lastName": "Last Name",
  "auth.updatePassword": "Update password",
  "auth.updatePasswordInstructions": "Choose a new password.",
  "screen.settings.language": "Language",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    locale: "en",
    setLocale: vi.fn(),
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe("auth UI", () => {
  it("renders Google and email/password sign-in options", () => {
    const html = renderToStaticMarkup(<LoginCard />);

    expect(html).toContain("Continue with Google");
    expect(html).toContain("or continue with email");
    expect(html).toContain("Email");
    expect(html).toContain("Password");
    expect(html).toContain("Sign in with email");
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Create account");
  });

  it("renders the password requirements checklist", () => {
    const html = renderToStaticMarkup(
      <PasswordRequirementsChecklist password="Aa1!" />,
    );

    expect(html).toContain("Your password must include:");
    expect(html).toContain("At least 8 characters");
    expect(html).toContain("One lowercase letter");
    expect(html).toContain("One uppercase letter");
    expect(html).toContain("One number");
    expect(html).toContain("One symbol");
  });

  it("renders the password update form", () => {
    const html = renderToStaticMarkup(<UpdatePasswordCard />);

    expect(html).toContain("Update password");
    expect(html).toContain("New password");
    expect(html).toContain("Choose a new password.");
  });
});
