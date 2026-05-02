import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

/**
 * WalletTabs — Animated segmented control (iOS native feel).
 *
 * Uses Framer Motion `layoutId` so the active "pill" smoothly springs
 * between buttons. Themable: `bg-muted/40` track, `bg-card` pill,
 * active label uses `text-primary`.
 */

export type WalletTabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const WalletTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: WalletTabItem[];
  active: string;
  onChange: (id: string) => void;
}) => {
  return (
    <div
      role="tablist"
      className="-mx-1 flex snap-x gap-1 overflow-x-auto rounded-2xl bg-muted/40 p-1 ring-1 ring-border/50 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative flex flex-1 min-w-[5.5rem] snap-start items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-extrabold transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="wallet-tab-pill"
                className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-border/60"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
