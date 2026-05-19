export const authPasswordMinLength = 8;
export const authNameMaxLength = 80;

export type EmailPasswordAuthMode = "reset" | "signIn" | "signUp";

export type EmailPasswordAuthValidationInput = {
  confirmPassword?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  mode: EmailPasswordAuthMode;
  password?: string;
};

export type EmailPasswordAuthValidationResult = {
  errors: {
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
  const fullName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

  return {
    first_name: trimmedFirstName,
    full_name: fullName,
    last_name: trimmedLastName,
    name: fullName,
  };
}

export type PasswordRequirementKey =
  | "lowercase"
  | "minLength"
  | "number"
  | "symbol"
  | "uppercase";

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
      errors.password = "auth.passwordRequired";
    } else if (mode === "signUp") {
      if (normalizedPassword.length < authPasswordMinLength) {
        errors.password = "auth.passwordMinLength";
      } else if (!meetsPasswordComplexityRules(normalizedPassword)) {
        errors.password = "auth.passwordRequirements";
      }
    }
  }

  if (mode === "signUp") {
    if (!normalizedFirstName) {
      errors.firstName = "auth.firstNameRequired";
    } else if (normalizedFirstName.length > authNameMaxLength) {
      errors.firstName = "auth.nameTooLong";
    }

    if (normalizedLastName.length > authNameMaxLength) {
      errors.lastName = "auth.nameTooLong";
    }

    const confirmPasswordError = validatePasswordConfirmation(
      normalizedPassword,
      normalizedConfirmPassword,
    );

    if (confirmPasswordError) {
      errors.confirmPassword = confirmPasswordError;
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function validatePasswordConfirmation(
  password?: string,
  confirmPassword?: string,
) {
  const normalizedPassword = password ?? "";
  const normalizedConfirmPassword = confirmPassword ?? "";

  if (!normalizedConfirmPassword) {
    return "auth.confirmPasswordRequired";
  }

  if (normalizedConfirmPassword !== normalizedPassword) {
    return "auth.passwordMismatch";
  }

  return undefined;
}

export function validateNewPassword(password?: string) {
  const normalizedPassword = password ?? "";

  if (!normalizedPassword) {
    return "auth.passwordRequired";
  }

  if (normalizedPassword.length < authPasswordMinLength) {
    return "auth.passwordMinLength";
  }

  if (!meetsPasswordComplexityRules(normalizedPassword)) {
    return "auth.passwordRequirements";
  }

  return undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
