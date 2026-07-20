import { describe, expect, it } from "vitest";

import {
  authNameMaxLength,
  authPasswordMinLength,
  buildSignUpUserMetadata,
  getPasswordRequirementChecks,
  meetsPasswordComplexityRules,
  validateEmailPasswordAuth,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/email-password";

const validPassword = "Secure1!x";

describe("email/password auth validation", () => {
  it("requires a valid email for sign in", () => {
    expect(
      validateEmailPasswordAuth({
        mode: "reset",
      }).errors.email,
    ).toBe("auth.emailRequired");

    expect(
      validateEmailPasswordAuth({
        email: "",
        mode: "signIn",
        password: validPassword,
      }),
    ).toEqual({
      errors: { email: "auth.emailRequired" },
      isValid: false,
    });

    expect(
      validateEmailPasswordAuth({
        email: "not-an-email",
        mode: "signIn",
        password: validPassword,
      }).errors.email,
    ).toBe("auth.invalidEmail");
  });

  it("requires a password on sign in without enforcing complexity rules", () => {
    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        mode: "signIn",
        password: "",
      }).errors.password,
    ).toBe("auth.passwordRequired");

    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        mode: "signIn",
        password: "legacy",
      }),
    ).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("requires a minimum password length for sign up and password updates", () => {
    expect(
      validateEmailPasswordAuth({
        confirmPassword: "short1!",
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: "short1!",
      }).errors.password,
    ).toBe("auth.passwordMinLength");

    expect(validateNewPassword("x".repeat(authPasswordMinLength - 1))).toBe(
      "auth.passwordMinLength",
    );
  });

  it("does not require a password when requesting reset email", () => {
    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        mode: "reset",
      }),
    ).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("accepts valid sign in credentials", () => {
    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        mode: "signIn",
        password: validPassword,
      }),
    ).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("requires a first name on sign up", () => {
    expect(
      validateEmailPasswordAuth({
        acceptedTerms: true,
        confirmPassword: validPassword,
        email: "user@example.com",
        mode: "signUp",
        password: validPassword,
      }).errors.firstName,
    ).toBe("auth.firstNameRequired");

    expect(
      validateEmailPasswordAuth({
        acceptedTerms: true,
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        lastName: "Souza",
        mode: "signUp",
        password: validPassword,
      }),
    ).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("requires accepting the Terms of Use and Privacy Policy on sign up", () => {
    expect(
      validateEmailPasswordAuth({
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }).errors.acceptedTerms,
    ).toBe("auth.acceptTermsRequired");

    expect(
      validateEmailPasswordAuth({
        acceptedTerms: false,
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }).errors.acceptedTerms,
    ).toBe("auth.acceptTermsRequired");

    expect(
      validateEmailPasswordAuth({
        acceptedTerms: true,
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }).errors.acceptedTerms,
    ).toBeUndefined();

    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        mode: "signIn",
        password: validPassword,
      }).errors.acceptedTerms,
    ).toBeUndefined();
  });

  it("builds sign up metadata for Supabase and the profile trigger", () => {
    expect(buildSignUpUserMetadata("Felipe", "Souza")).toEqual({
      first_name: "Felipe",
      full_name: "Felipe Souza",
      last_name: "Souza",
      name: "Felipe Souza",
      terms_accepted: true,
    });

    expect(buildSignUpUserMetadata("Felipe", "")).toEqual({
      first_name: "Felipe",
      full_name: "Felipe",
      last_name: "",
      name: "Felipe",
      terms_accepted: true,
    });
  });

  it("rejects names that are too long on sign up", () => {
    const longName = "a".repeat(authNameMaxLength + 1);

    expect(
      validateEmailPasswordAuth({
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: longName,
        mode: "signUp",
        password: validPassword,
      }).errors.firstName,
    ).toBe("auth.nameTooLong");

    expect(
      validateEmailPasswordAuth({
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        lastName: longName,
        mode: "signUp",
        password: validPassword,
      }).errors.lastName,
    ).toBe("auth.nameTooLong");
  });

  it("validates password confirmation", () => {
    expect(validatePasswordConfirmation()).toBe("auth.confirmPasswordRequired");
    expect(
      validatePasswordConfirmation(validPassword, validPassword),
    ).toBeUndefined();
    expect(validatePasswordConfirmation(validPassword, "")).toBe(
      "auth.confirmPasswordRequired",
    );
    expect(validatePasswordConfirmation(validPassword, "Different1!")).toBe(
      "auth.passwordMismatch",
    );
  });

  it("requires matching passwords on sign up", () => {
    expect(
      validateEmailPasswordAuth({
        confirmPassword: "Different1!",
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }).errors.confirmPassword,
    ).toBe("auth.passwordMismatch");

    expect(
      validateEmailPasswordAuth({
        acceptedTerms: true,
        confirmPassword: validPassword,
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }),
    ).toEqual({
      errors: {},
      isValid: true,
    });
  });

  it("returns individual password requirement checks", () => {
    expect(getPasswordRequirementChecks(validPassword)).toEqual({
      lowercase: true,
      minLength: true,
      number: true,
      symbol: true,
      uppercase: true,
    });

    expect(getPasswordRequirementChecks("")).toEqual({
      lowercase: false,
      minLength: false,
      number: false,
      symbol: false,
      uppercase: false,
    });
  });

  it("requires lowercase, uppercase, digits, and symbols for new passwords", () => {
    expect(meetsPasswordComplexityRules(validPassword)).toBe(true);
    expect(meetsPasswordComplexityRules("secure1!x")).toBe(false);
    expect(meetsPasswordComplexityRules("SECURE1!X")).toBe(false);
    expect(meetsPasswordComplexityRules("Secure!xx")).toBe(false);
    expect(meetsPasswordComplexityRules("Secure1xx")).toBe(false);

    expect(
      validateEmailPasswordAuth({
        confirmPassword: "12345678",
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: "12345678",
      }).errors.password,
    ).toBe("auth.passwordRequirements");

    expect(
      validateEmailPasswordAuth({
        confirmPassword: "password123",
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: "password123",
      }).errors.password,
    ).toBe("auth.passwordRequirements");

    expect(
      validateEmailPasswordAuth({
        confirmPassword: "PASSWORD1!",
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: "PASSWORD1!",
      }).errors.password,
    ).toBe("auth.passwordRequirements");

    expect(validateNewPassword()).toBe("auth.passwordRequired");
    expect(validateNewPassword("")).toBe("auth.passwordRequired");
    expect(validateNewPassword("Sec1!ab")).toBe("auth.passwordMinLength");
    expect(validateNewPassword("password123")).toBe(
      "auth.passwordRequirements",
    );
    expect(validateNewPassword(validPassword)).toBeUndefined();

    expect(
      validateEmailPasswordAuth({
        email: "user@example.com",
        firstName: "Felipe",
        mode: "signUp",
        password: validPassword,
      }).errors.confirmPassword,
    ).toBe("auth.confirmPasswordRequired");
  });
});
