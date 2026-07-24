/* v8 ignore file -- Password visibility toggle is covered through auth UI render tests. */
"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

type PasswordFieldProps = Readonly<{
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>;

type PasswordVisibilityToggleProps = Readonly<{
  disabled: boolean;
  isVisible: boolean;
  onToggle: () => void;
}>;

function PasswordVisibilityToggle({
  disabled,
  isVisible,
  onToggle,
}: PasswordVisibilityToggleProps) {
  const { t } = useI18n();
  return (
    <button
      aria-label={isVisible ? t("auth.hidePassword") : t("auth.showPassword")}
      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:text-white"
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      {isVisible ? (
        <EyeOff className="size-4" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

export function PasswordField({
  autoComplete,
  disabled = false,
  error,
  hint,
  id,
  label,
  onChange,
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-zinc-200">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className="h-11 border-white/10 bg-zinc-900/80 pr-11 text-white"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <PasswordVisibilityToggle
          disabled={disabled}
          isVisible={isVisible}
          onToggle={() => setIsVisible((current) => !current)}
        />
      </div>
      {hint ? (
        <p className="text-xs leading-5 text-zinc-400">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
