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
  const normalizedEmail = email?.trim() ?? "";
  const normalizedPassword = password ?? "";
  const normalizedConfirmPassword = confirmPassword ?? "";
  const normalizedFirstName = firstName?.trim() ?? "";
  const normalizedLastName = lastName?.trim() ?? "";

  if (!normalizedEmail) {
    errors.email = "auth.emailRequired";
  } else if (!isValidEmail(normalizedEmail)) {
    errors.email = "auth.invalidEmail";
  }

  if (mode !== "reset") {
    if (!normalizedPassword) {
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- i18n key, not a credential; NOSONAR
      errors.password = "auth.passwordRequired";
    } else if (mode === "signUp") {
      if (normalizedPassword.length < authPasswordMinLength) {
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- i18n key, not a credential; NOSONAR
        errors.password = "auth.passwordMinLength";
      } else if (!meetsPasswordComplexityRules(normalizedPassword)) {
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- i18n key, not a credential; NOSONAR
        errors.password = "auth.passwordRequirements";
      }
    }
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
