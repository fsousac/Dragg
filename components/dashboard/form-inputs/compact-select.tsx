"use client";

import { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CompactSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: string }>;
  error?: string;
  icon?: ReactNode;
}

export function CompactSelect({
  label,
  id,
  value,
  onChange,
  options,
  error,
  icon,
}: CompactSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 uppercase tracking-wide"
      >
        {icon}
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className={`
            h-9 text-sm bg-background/70 border-border/60 
            hover:border-border/80 focus:border-primary/70 focus:bg-background/80
            transition-all duration-200 rounded-lg
            ${error ? "border-destructive/60" : ""}
          `}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-border/40 bg-background/95 backdrop-blur-sm">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive/80">{error}</p>}
    </div>
  );
}
