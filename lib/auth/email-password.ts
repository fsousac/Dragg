export const authPasswordMinLength = 8;
export const authNameMaxLength = 80;

export type EmailPasswordAuthMode = "reset" | "signIn" | "signUp";

export type EmailPasswordAuthValidationInput = {
  acceptedTerms?: boolean;
  confirmPassword?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  mode: EmailPasswordAuthMode;
  password?: string;
};

export type EmailPasswordAuthValidationResult = {
  errors: {
    acceptedTerms?: string;
    confirmPassword?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };
  isValid: boolean;
};

export function buildSignUpUserMetadata(firstName: string, lastName: string) {
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const fullName = [trimmedFirstName, trimmedLastName]
    .filter(Boolean)
    .join(" ");

  return {
    first_name: trimmedFirstName,
    full_name: fullName,
    last_name: trimmedLastName,
    name: fullName,
    terms_accepted: true,
  };
}

export type PasswordRequirementKey =
  "lowercase" | "minLength" | "number" | "symbol" | "uppercase";

export type PasswordRequirementChecks = Record<PasswordRequirementKey, boolean>;

export function getPasswordRequirementChecks(
  password: string,
): PasswordRequirementChecks {
  return {
    lowercase: /[a-z]/.test(password),
    minLength: password.length >= authPasswordMinLength,
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
  };
}

export function meetsPasswordComplexityRules(password: string) {
  return Object.values(getPasswordRequirementChecks(password)).every(Boolean);
}

function trimmed(value?: string) {
  return value?.trim() ?? "";
}

function validateAuthEmail(email: string) {
  if (!email) {
    return "auth.emailRequired";
  }

  if (!isValidEmail(email)) {
    return "auth.invalidEmail";
  }

  return undefined;
}

function validateAuthPassword(mode: EmailPasswordAuthMode, password: string) {
  if (mode === "reset") {
    return undefined;
  }

  if (!password) {
    return "auth.passwordRequired";
  }

  if (mode !== "signUp") {
    return undefined;
  }

  if (password.length < authPasswordMinLength) {
    return "auth.passwordMinLength";
  }

  if (!meetsPasswordComplexityRules(password)) {
    return "auth.passwordRequirements";
  }

  return undefined;
}

export function validateEmailPasswordAuth({
  acceptedTerms,
  confirmPassword,
  email,
  firstName,
  lastName,
  mode,
  password,
}: EmailPasswordAuthValidationInput): EmailPasswordAuthValidationResult {
  const errors: EmailPasswordAuthValidationResult["errors"] = {};
  const normalizedEmail = trimmed(email);
  const normalizedPassword = password ?? "";
  const normalizedConfirmPassword = confirmPassword ?? "";
  const normalizedFirstName = trimmed(firstName);
  const normalizedLastName = trimmed(lastName);

  const emailError = validateAuthEmail(normalizedEmail);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validateAuthPassword(mode, normalizedPassword);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (mode === "signUp") {
    Object.assign(
      errors,
      validateSignUpFields({
        acceptedTerms,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        password: normalizedPassword,
        confirmPassword: normalizedConfirmPassword,
      }),
    );
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

function validateSignUpFields({
  acceptedTerms,
  confirmPassword,
  firstName,
  lastName,
  password,
}: {
  acceptedTerms?: boolean;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  password: string;
}): EmailPasswordAuthValidationResult["errors"] {
  const errors: EmailPasswordAuthValidationResult["errors"] = {};

  if (!firstName) {
    errors.firstName = "auth.firstNameRequired";
  } else if (firstName.length > authNameMaxLength) {
    errors.firstName = "auth.nameTooLong";
  }

  if (lastName.length > authNameMaxLength) {
    errors.lastName = "auth.nameTooLong";
  }

  const confirmPasswordError = validatePasswordConfirmation(
    password,
    confirmPassword,
  );

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  if (!acceptedTerms) {
    errors.acceptedTerms = "auth.acceptTermsRequired";
  }

  return errors;
}

export function validatePasswordConfirmation(
  password = "",
  confirmPassword = "",
) {
  if (!confirmPassword) {
    return "auth.confirmPasswordRequired";
  }

  if (confirmPassword !== password) {
    return "auth.passwordMismatch";
  }

  return undefined;
}

export function validateNewPassword(password = "") {
  if (!password) {
    return "auth.passwordRequired";
  }

  if (password.length < authPasswordMinLength) {
    return "auth.passwordMinLength";
  }

  if (!meetsPasswordComplexityRules(password)) {
    return "auth.passwordRequirements";
  }

  return undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+$/.test(email) && email.includes(".");
}
