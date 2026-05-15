/**
 * GlassSelect — Steel Glass select cell.
 *
 * Wraps shadcn's Radix Select with a `glass-steel-strong` trigger + content
 * surface so it reads as a native OS picker. Pure presentation: parent owns
 * value/onChange (e.g. via react-hook-form Controller).
 */
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GlassFieldShell } from "./GlassInput";

export type GlassSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface GlassSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  wrapperClassName?: string;
  className?: string;
  name?: string;
}

export function GlassSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "اختر…",
  label,
  hint,
  error,
  required,
  disabled,
  wrapperClassName,
  className,
  name,
}: GlassSelectProps) {
  return (
    <GlassFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        dir="rtl"
      >
        <SelectTrigger
          className={cn(
            "h-auto rounded-2xl border border-white/40 bg-white/55 px-4 py-2.5 text-[13.5px] backdrop-blur-md " +
              "shadow-inner focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/40",
            error && "border-rose-400/70 ring-rose-300/40",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="glass-steel-strong rounded-2xl border border-white/40 backdrop-blur-2xl">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="rounded-xl text-[13px]"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </GlassFieldShell>
  );
}

export default GlassSelect;
