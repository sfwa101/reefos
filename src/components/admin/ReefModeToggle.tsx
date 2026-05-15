/**
 * ReefModeToggle — Steel Glass dual-face switch.
 *
 * Renders ONLY when the active OS company is "reef". Lets the admin
 * flip between operational ERP and the App Factory hub. Selection is
 * persisted via the `useReefMode` Zustand store.
 */
import { motion } from "framer-motion";
import { Factory, Store } from "lucide-react";

import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";
import { useReefMode, type ReefMode } from "@/core/identity/useReefMode";
import { cn } from "@/lib/utils";

const OPTIONS: ReadonlyArray<{ id: ReefMode; label: string; icon: typeof Store }> = [
  { id: "erp", label: "ERP", icon: Store },
  { id: "factory", label: "المصنع", icon: Factory },
];

export function ReefModeToggle() {
  const activeOSId = useActiveOSCompany((s) => s.activeId);
  const mode = useReefMode((s) => s.mode);
  const setMode = useReefMode((s) => s.setMode);

  if (activeOSId !== "reef") return null;

  return (
    <div
      role="radiogroup"
      aria-label="وضع ريف المدينة"
      className="relative hidden h-10 items-center gap-1 rounded-2xl border border-white/40 bg-white/40 p-1 backdrop-blur-md md:inline-flex"
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(opt.id)}
            className={cn(
              "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12px] font-extrabold transition",
              active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="reef-mode-pill"
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-elevated"
              />
            )}
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
