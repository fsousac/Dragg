"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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

function digitsFromValue(value: number): string {
  const cents = Math.round(value * 100);
  return cents > 0 ? String(cents) : "";
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  return (Number.parseInt(digits, 10) / 100).toFixed(2).replace(".", ",");
}

const BLOCKED_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Delete",
];

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
  const [digits, setDigits] = useState(() => digitsFromValue(value));
  const [isFocused, setIsFocused] = useState(false);
  const prevValueRef = useRef(value);

  /* c8 ignore start */
  useEffect(() => {
    const externalCents = Math.round(value * 100);
    const internalCents = digits ? Number.parseInt(digits, 10) : 0;
    if (externalCents !== internalCents && value !== prevValueRef.current) {
      setDigits(digitsFromValue(value));
    }
    prevValueRef.current = value;
  }, [value, digits]);

  function pushDigits(newDigits: string) {
    // Remove leading zeros, cap at 13 digits (~999 billion cents)
    const normalized = newDigits.replace(/^0+/, "");
    if (normalized.length > 13) return;
    setDigits(normalized);
    onValueChange(normalized ? Number.parseInt(normalized, 10) / 100 : 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (BLOCKED_KEYS.includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      pushDigits(digits + e.key);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      pushDigits(digits.slice(0, -1));
      return;
    }
    // Allow Tab, block everything else
    if (e.key !== "Tab") {
      e.preventDefault();
    }
  }

  // Mobile fallback: virtual keyboard fires onChange without keydown
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    pushDigits(raw);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    const input = e.currentTarget;
    setTimeout(() => {
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }

  function handleBlur() {
    setIsFocused(false);
    // Clear if still zero so placeholder is shown again
    if (!digits) onValueChange(0);
  }

  function handleClick(e: React.MouseEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    input.setSelectionRange(input.value.length, input.value.length);
  }
  /* c8 ignore stop */

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
          placeholder="0,00"
          value={isFocused && !digits ? "0,00" : formatDigits(digits)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          autoComplete="off"
          className={cn(
            "h-fit bg-background/70 text-left text-sm tabular-nums transition-all duration-200 placeholder:text-foreground/50 hover:border-border/80 focus:border-primary/70 focus:bg-background/80",
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
