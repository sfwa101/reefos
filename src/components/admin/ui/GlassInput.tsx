/**
 * GlassInput / GlassTextarea — Steel Glass form cells.
 *
 * Pure dumb presentation primitives. Compose inside react-hook-form
 * Controllers or feed via {...register("field")}. They never read state
 * directly. Designed for RTL via logical properties.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function GlassFieldShell({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps) {
  return (
    <label className={cn("block space-y-1.5", className)} dir="rtl">
      {label ? (
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-foreground/70">
          {label}
          {required ? <span className="text-rose-500">•</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="block text-[11px] font-semibold text-rose-500">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-foreground/55">{hint}</span>
      ) : null}
    </label>
  );
}

const baseField =
  "block w-full rounded-2xl border border-white/40 bg-white/55 px-4 py-2.5 text-[13.5px] text-foreground " +
  "shadow-inner backdrop-blur-md transition placeholder:text-foreground/35 " +
  "focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/40 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export interface GlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, hint, error, required, wrapperClassName, className, ...props }, ref) => (
    <GlassFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <input
        ref={ref}
        required={required}
        aria-invalid={!!error}
        className={cn(baseField, error && "border-rose-400/70 ring-rose-300/40", className)}
        {...props}
      />
    </GlassFieldShell>
  ),
);
GlassInput.displayName = "GlassInput";

export interface GlassTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  wrapperClassName?: string;
}

export const GlassTextarea = React.forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, hint, error, required, wrapperClassName, className, rows = 3, ...props }, ref) => (
    <GlassFieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        rows={rows}
        required={required}
        aria-invalid={!!error}
        className={cn(
          baseField,
          "resize-y leading-relaxed",
          error && "border-rose-400/70 ring-rose-300/40",
          className,
        )}
        {...props}
      />
    </GlassFieldShell>
  ),
);
GlassTextarea.displayName = "GlassTextarea";

export default GlassInput;
