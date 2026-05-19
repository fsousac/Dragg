import { describe, expect, it } from "vitest";

import { mapSupabaseAuthError } from "@/lib/auth/supabase-auth-errors";

describe("mapSupabaseAuthError", () => {
  it("maps duplicate email errors during sign up", () => {
    expect(
      mapSupabaseAuthError({ code: "user_already_exists" }, "signUp"),
    ).toBe("auth.emailAlreadyRegistered");

    expect(mapSupabaseAuthError({ code: "email_exists" }, "signUp")).toBe(
      "auth.emailAlreadyRegistered",
    );

    expect(
      mapSupabaseAuthError(
        { message: "User already been registered" },
        "signUp",
      ),
    ).toBe("auth.emailAlreadyRegistered");
  });

  it("maps weak password errors", () => {
    expect(mapSupabaseAuthError({ code: "weak_password" }, "signUp")).toBe(
      "auth.weakPassword",
    );

    expect(
      mapSupabaseAuthError({ message: "Password is weak password" }, "signUp"),
    ).toBe("auth.weakPassword");
  });

  it("maps redirect validation failures", () => {
    expect(
      mapSupabaseAuthError(
        { message: "redirect_to is not allowed" },
        "signUp",
      ),
    ).toBe("auth.redirectNotAllowed");

    expect(
      mapSupabaseAuthError({ code: "validation_failed" }, "signUp"),
    ).toBe("auth.redirectNotAllowed");
  });

  it("maps provider and rate limit failures", () => {
    expect(mapSupabaseAuthError({ code: "signup_disabled" }, "signUp")).toBe(
      "auth.signUpDisabled",
    );

    expect(
      mapSupabaseAuthError({ code: "over_email_send_rate_limit" }, "signUp"),
    ).toBe("auth.rateLimitError");

    expect(
      mapSupabaseAuthError({ code: "over_request_rate_limit" }, "signUp"),
    ).toBe("auth.rateLimitError");
  });

  it("maps invalid email errors", () => {
    expect(
      mapSupabaseAuthError({ code: "email_address_invalid" }, "signUp"),
    ).toBe("auth.invalidEmail");

    expect(
      mapSupabaseAuthError({ message: "invalid email format" }, "signUp"),
    ).toBe("auth.invalidEmail");
  });

  it("falls back to mode-specific defaults", () => {
    expect(mapSupabaseAuthError({}, "signIn")).toBe("auth.invalidCredentials");
    expect(mapSupabaseAuthError({}, "signUp")).toBe("auth.signUpError");
    expect(mapSupabaseAuthError({}, "reset")).toBe("auth.resetPasswordError");
  });
});
