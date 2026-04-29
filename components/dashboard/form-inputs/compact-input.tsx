"use client";

import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompactInputProps {
  label: string;
  id: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: ReactNode;
  error?: string;
  min?: string;
  max?: string;
  inputClassName?: string;
}

export function CompactInput({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  error,
  min,
  max,
  inputClassName,
}: CompactInputProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-foreground/70 uppercase tracking-wide"
      >
        {label}
      </Label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-foreground/60 transition-colors">
            {icon}
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          max={max}
          className={`
            ${icon ? "pl-9" : ""} h-9 text-sm bg-background/70 border-border/60
            hover:border-border/80 focus:border-primary/70 focus:bg-background/80
            transition-all duration-200 rounded-lg
            placeholder:text-foreground/50
            ${error ? "border-destructive/60" : ""}
            ${inputClassName ?? ""}
          `}
        />
      </div>
      {error && <p className="text-xs text-destructive/80">{error}</p>}
    </div>
  );
}
