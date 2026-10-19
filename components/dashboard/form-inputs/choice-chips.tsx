"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const CHIP_BASE_CLASS =
  "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 cursor-pointer max-w-full";
export const CHIP_SELECTED_CLASS =
  "border-green-500 bg-green-500/20 text-green-400 font-semibold";
export const CHIP_IDLE_CLASS =
  "border-border/40 text-foreground/70 hover:border-border/60 hover:bg-foreground/5";

type ChoiceChipsProps<T extends string> = {
  readonly label: string;
  readonly labelClassName: string;
  readonly hideLabel?: boolean;
  readonly value: T;
  readonly options: { value: T; label: string; hint?: string }[];
  readonly onChange: (value: T) => void;
};

// Single choice rendered like the form's payment method chips: wraps on
// narrow screens instead of squeezing every option into one row.
export function ChoiceChips<T extends string>({
  label,
  labelClassName,
  hideLabel = false,
  value,
  options,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <div>
      {hideLabel ? null : <span className={labelClassName}>{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2 min-w-0 max-w-full">
        {options.map((option) => {
          const chip = (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              onClick={() => onChange(option.value)}
              className={`${CHIP_BASE_CLASS} ${value === option.value ? CHIP_SELECTED_CLASS : CHIP_IDLE_CLASS}`}
            >
              {option.label}
            </button>
          );

          return option.hint ? (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>{chip}</TooltipTrigger>
              <TooltipContent>{option.hint}</TooltipContent>
            </Tooltip>
          ) : (
            chip
          );
        })}
      </div>
    </div>
  );
}
