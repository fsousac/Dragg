"use client";

import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CurrencyInputProps = {
  className?: string;
  error?: string;
  icon?: ReactNode;
  id: string;
  inputClassName?: string;
  label: string;
  labelClassName?: string;
  onValueChange: (value: number) => void;
  value: number;
};

export function formatCurrencyInputValue(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
  return safeValue.toFixed(2).replace(".", ",");
}

export function getCurrencyInputValueFromRawValue(value: string) {
  const digits = value.replace(/\D/g, "");
  const cents = digits ? Number.parseInt(digits, 10) : 0;

  return cents / 100;
}

export function createCurrencyInputChangeHandler(
  onValueChange: (value: number) => void,
) {
  return (event: { target: { value: string } }) => {
    onValueChange(getCurrencyInputValueFromRawValue(event.target.value));
  };
}

export function createCurrencyInputEditingHandler(
  setIsEditing: (value: boolean) => void,
  value: boolean,
) {
  return () => setIsEditing(value);
}

export function CurrencyInput({
  className,
  error,
  icon,
  id,
  inputClassName,
  label,
  labelClassName,
  onValueChange,
  value,
}: CurrencyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const hasValue = value > 0;

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-xs font-medium uppercase tracking-wide text-foreground/70",
          labelClassName,
        )}
      >
        {label}
      </Label>
      <div className="group relative min-w-0 overflow-hidden">
        {icon ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-foreground/60">
            {icon}
          </div>
        ) : null}
        <Input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*,[0-9]{2}"
          placeholder="0,00"
          value={isEditing || hasValue ? formatCurrencyInputValue(value) : ""}
          onChange={createCurrencyInputChangeHandler(onValueChange)}
          onBlur={createCurrencyInputEditingHandler(setIsEditing, false)}
          onFocus={createCurrencyInputEditingHandler(setIsEditing, true)}
          className={cn(
            "h-9 bg-background/70 text-left text-sm tabular-nums transition-all duration-200 placeholder:text-foreground/50 hover:border-border/80 focus:border-primary/70 focus:bg-background/80",
            icon ? "pl-9" : "",
            error ? "border-destructive/60" : "",
            inputClassName,
          )}
        />
      </div>
      {error ? <p className="text-xs text-destructive/80">{error}</p> : null}
    </div>
  );
}
