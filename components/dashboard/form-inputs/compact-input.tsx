"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompactInputProps {
  readonly label: string;
  readonly id: string;
  readonly type?: string;
  readonly value?: string | number;
  readonly onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly icon?: ReactNode;
  readonly error?: string;
  readonly min?: string;
  readonly max?: string;
  readonly inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  readonly pattern?: string;
  readonly inputClassName?: string;
}

function getCompactInputClassName(
  icon: ReactNode,
  error: string | undefined,
  inputClassName: string | undefined,
) {
  return `
            ${icon ? "pl-9" : ""} h-9 text-sm bg-background/70 border-border/60
            hover:border-border/80 focus:border-primary/70 focus:bg-background/80
            transition-all duration-200 rounded-lg
            placeholder:text-foreground/50
            w-full min-w-0 max-w-full
            ${error ? "border-destructive/60" : ""}
            ${inputClassName ?? ""}
          `;
}

function CompactInputIcon({ icon }: { readonly icon: ReactNode }) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-foreground/60 transition-colors">
      {icon}
    </div>
  );
}

export function CompactInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  icon,
  error,
  min,
  max,
  inputMode,
  pattern,
  inputClassName,
}: CompactInputProps) {
  return (
    <div className="w-full min-w-0 space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-foreground/70 uppercase tracking-wide"
      >
        {label}
      </Label>
      <div className="relative group w-full min-w-0 overflow-hidden">
        {icon && <CompactInputIcon icon={icon} />}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          inputMode={inputMode}
          pattern={pattern}
          className={getCompactInputClassName(icon, error, inputClassName)}
        />
      </div>
      {error && <p className="text-xs text-destructive/80">{error}</p>}
    </div>
  );
}
