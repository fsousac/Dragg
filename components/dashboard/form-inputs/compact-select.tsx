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
import { Plus } from "lucide-react";

interface CompactSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: string }>;
  disabled?: boolean;
  error?: string;
  icon?: ReactNode;
  addActionLabel?: string;
  onAddAction?: () => void;
}

export function CompactSelect({
  label,
  id,
  value,
  onChange,
  options,
  disabled = false,
  error,
  icon,
  addActionLabel,
  onAddAction,
}: CompactSelectProps) {
  return (
    <div className="w-full space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 uppercase tracking-wide"
      >
        {icon}
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={`
            h-9 text-sm bg-background/70 border-border/60 
            hover:border-border/80 focus:border-primary/70 focus:bg-background/80
            transition-all duration-200 rounded-lg
            w-full
            ${error ? "border-destructive/60" : ""}
            ${disabled ? "opacity-80" : ""}
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
          {addActionLabel && onAddAction && (
            <div className="mt-1 border-t border-border/50 p-1">
              <button
                type="button"
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-foreground/5 hover:text-foreground"
                onClick={onAddAction}
              >
                <Plus className="h-4 w-4" />
                {addActionLabel}
              </button>
            </div>
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive/80">{error}</p>}
    </div>
  );
}
