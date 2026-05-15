/**
 * GlassFormModal — extends GlassDialog with a persistent Save/Cancel footer
 * and a built-in loading state. Pure presentation: parent owns the form
 * state, `react-hook-form`, and the `onSubmit` mutation.
 *
 * Render the form fields as children; the modal handles the submit button
 * spinner, disabled state, and graceful close on success.
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassDialog, GlassDialogClose } from "./GlassDialog";
import { cn } from "@/lib/utils";

export type GlassFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Called when the user clicks "Save". Throw to keep modal open. */
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** Tailwind size class for the panel. Default: max-w-2xl. */
  size?: string;
  /** Disable the submit button independent of loading. */
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function GlassFormModal({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  onSubmit,
  submitting,
  submitLabel = "حفظ",
  cancelLabel = "إلغاء",
  size = "max-w-2xl",
  disabled,
  className,
  children,
}: GlassFormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || disabled) return;
    void onSubmit();
  };

  return (
    <GlassDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      eyebrow={eyebrow}
      size={size}
      className={className}
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        <div className={cn("space-y-4")}>{children}</div>

        <footer className="-mx-6 -mb-6 mt-6 flex items-center justify-end gap-2 border-t border-white/30 bg-white/30 px-6 py-4 backdrop-blur-md">
          <GlassDialogClose asChild>
            <Button type="button" variant="ghost" className="rounded-2xl">
              {cancelLabel}
            </Button>
          </GlassDialogClose>
          <Button
            type="submit"
            disabled={!!submitting || !!disabled}
            className="rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 px-6 font-bold text-white shadow-lg hover:opacity-95"
          >
            {submitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جارٍ الحفظ…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </footer>
      </form>
    </GlassDialog>
  );
}

export default GlassFormModal;
