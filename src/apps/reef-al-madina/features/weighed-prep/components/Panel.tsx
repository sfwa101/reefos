// Shared collapsible panel + animated number used inside the butcher sheet.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** Animated number — counts up/down to `value` over a short interval. */
export const AnimatedNumber = ({
  value, className,
}: { value: number; className?: string }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 360;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{toLatin(display)}</span>;
};

/** Collapsible card section — premium accordion shell */
export const Panel = ({
  icon, title, hint, defaultOpen = true, children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-right"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-extrabold">{title}</span>
          {hint && <span className="text-[10px] font-bold text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-3.5 pb-3.5 pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
