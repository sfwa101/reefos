import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      className="grid w-full gap-1 rounded-2xl bg-foreground/5 p-1 ring-1 ring-border/40 backdrop-blur-xl"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.id === active;
        return (
          <Button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[12px] font-extrabold transition-colors ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="wallet-tab-pill"
                className="absolute inset-0 rounded-xl bg-background shadow-sm ring-1 ring-border/60"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {t.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};
