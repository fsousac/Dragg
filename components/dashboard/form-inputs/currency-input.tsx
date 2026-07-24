"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CurrencyInputProps = {
  readonly className?: string;
  readonly error?: string;
  readonly icon?: ReactNode;
  readonly id: string;
  readonly inputClassName?: string;
  readonly label: string;
  readonly labelClassName?: string;
  readonly onValueChange: (value: number) => void;
  readonly value: number;
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

const BLOCKED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Delete",
]);

function useCurrencyDigits(
  value: number,
  onValueChange: (value: number) => void,
) {
  const [digits, setDigits] = useState(() => digitsFromValue(value));
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
  /* c8 ignore stop */

  function pushDigits(newDigits: string) {
    // Remove leading zeros, cap at 13 digits (~999 billion cents)
    const normalized = newDigits.replace(/^0+/, "");
    if (normalized.length > 13) return;
    setDigits(normalized);
    onValueChange(normalized ? Number.parseInt(normalized, 10) / 100 : 0);
  }

  return { digits, pushDigits };
}

function handleCurrencyInputClick(e: React.MouseEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  input.setSelectionRange(input.value.length, input.value.length);
}

function createCurrencyInputFocusHandler(setIsFocused: (value: boolean) => void) {
  return (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    const input = e.currentTarget;
    setTimeout(() => {
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  };
}

type CurrencyInputHandlersParams = {
  digits: string;
  pushDigits: (newDigits: string) => void;
  onValueChange: (value: number) => void;
  setIsFocused: (value: boolean) => void;
};

/* c8 ignore start */
function useCurrencyInputHandlers({
  digits,
  pushDigits,
  onValueChange,
  setIsFocused,
}: CurrencyInputHandlersParams) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (BLOCKED_KEYS.has(e.key)) {
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

  function handleBlur() {
    setIsFocused(false);
    // Clear if still zero so placeholder is shown again
    if (!digits) onValueChange(0);
  }

  return {
    handleBlur,
    handleChange,
    handleClick: handleCurrencyInputClick,
    handleFocus: createCurrencyInputFocusHandler(setIsFocused),
    handleKeyDown,
  };
}
/* c8 ignore stop */

type CurrencyInputFieldProps = Pick<
  CurrencyInputProps,
  "error" | "icon" | "id" | "inputClassName"
> & {
  readonly inputValue: string;
  readonly handlers: ReturnType<typeof useCurrencyInputHandlers>;
};

function CurrencyInputField({
  error,
  icon,
  id,
  inputClassName,
  inputValue,
  handlers,
}: CurrencyInputFieldProps) {
  const { handleBlur, handleChange, handleClick, handleFocus, handleKeyDown } = handlers;

  return (
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
        value={inputValue}
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
  );
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
  const { digits, pushDigits } = useCurrencyDigits(value, onValueChange);
  const [isFocused, setIsFocused] = useState(false);
  const handlers = useCurrencyInputHandlers({ digits, pushDigits, onValueChange, setIsFocused });

  /* c8 ignore next */
  const inputValue = isFocused && !digits ? "0,00" : formatDigits(digits);

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
      <CurrencyInputField
        error={error}
        icon={icon}
        id={id}
        inputClassName={inputClassName}
        inputValue={inputValue}
        handlers={handlers}
      />
      {error ? <p className="text-xs text-destructive/80">{error}</p> : null}
    </div>
  );
}
