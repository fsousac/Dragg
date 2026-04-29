"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ReactNode } from "react";

interface CompactTextareaProps {
  label: string;
  id: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  icon?: ReactNode;
}

export function CompactTextarea({
  label,
  id,
  value,
  onChange,
  placeholder,
  icon,
}: CompactTextareaProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-foreground/70 uppercase tracking-wide"
      >
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-3 text-foreground/40">{icon}</div>
        )}
        <Textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            ${icon ? "pl-9" : ""} min-h-16 text-sm bg-background/70 border-border/60 
            hover:border-border/80 focus:border-primary/70 focus:bg-background/80
            transition-all duration-200 rounded-lg resize-none
            placeholder:text-foreground/50
          `}
        />
      </div>
    </div>
  );
}
