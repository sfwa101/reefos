/**
 * GlassDialog — Steel Glass interaction cell.
 *
 * Wraps shadcn's Radix Dialog with a `glass-steel-strong` + `bg-mesh`
 * surface so it floats over the AdminShell like a native OS window.
 * Pure presentation: no fetching, no side effects.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import * as React from "react";
import type { ReactNode } from "react";

import { Dialog, DialogPortal, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GlassDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional eyebrow chip above the title. */
  eyebrow?: ReactNode;
  /** Body content slot. */
  children?: ReactNode;
  /** Trailing action slot (typically buttons). */
  footer?: ReactNode;
  /** Tailwind size class for the content panel. Default: max-w-lg. */
  size?: string;
  className?: string;
};

const GlassDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
GlassDialogOverlay.displayName = "GlassDialogOverlay";

export function GlassDialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = "max-w-lg",
  className,
}: GlassDialogProps) {
  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogPortal>
        <GlassDialogOverlay />
        <DialogPrimitive.Content
          asChild
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[calc(100%-1.5rem)] translate-x-[-50%] translate-y-[-50%]",
            size,
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={cn(
              "glass-steel-strong bg-mesh relative overflow-hidden rounded-3xl border border-white/40 p-6 shadow-elevated",
              className,
            )}
            dir="rtl"
          >
            {(eyebrow || title || description) && (
              <header className="mb-4 space-y-1.5 pe-8">
                {eyebrow ? (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <DialogPrimitive.Title className="font-display text-xl font-extrabold tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                ) : null}
                {description ? (
                  <DialogPrimitive.Description className="text-[12.5px] text-foreground/70">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
              </header>
            )}

            <div className="text-[13px] text-foreground/90">{children}</div>

            {footer ? (
              <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
                {footer}
              </footer>
            ) : null}

            <DialogPrimitive.Close
              className="absolute end-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-white/40 bg-white/40 text-foreground/70 backdrop-blur-md transition hover:bg-white/60 hover:text-foreground"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" strokeWidth={2.4} />
            </DialogPrimitive.Close>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export { DialogClose as GlassDialogClose };
export default GlassDialog;
