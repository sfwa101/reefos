import { motion } from "framer-motion";
import { Plus, Send, PiggyBank, ScanLine, type LucideIcon } from "lucide-react";

/**
 * ActionGrid — Extensible glassmorphism action strip.
 *
 * Phase-B contract:
 *  - Receives an array of actions so it scales to N features without
 *    reflowing the layout (horizontal scroll fallback on overflow).
 *  - Glass surfaces (`bg-card/60 backdrop-blur-2xl`) bound to theme.
 *  - One tile per action can be marked `primary` to stand out as the
 *    main CTA (e.g. "شحن الرصيد" → `bg-primary text-primary-foreground`).
 */

export type WalletAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
};

const Tile = ({ action, index }: { action: WalletAction; index: number }) => {
  const Icon = action.icon;
  const isPrimary = !!action.primary;
  return (
    <motion.button
      type="button"
      onClick={action.onClick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.05 * index,
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.93 }}
      className={`group relative flex h-14 min-w-[4.25rem] snap-start flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-2 py-1.5 shadow-sm ring-1 backdrop-blur-2xl transition ${
        isPrimary
          ? "bg-primary text-primary-foreground ring-primary/40"
          : "bg-card/60 text-foreground ring-border/50"
      }`}
    >
      {/* Top glass highlight */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b ${
          isPrimary
            ? "from-primary-foreground/15 to-transparent"
            : "from-foreground/5 to-transparent"
        }`}
      />
      {/* Hover halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 ring-2 ring-primary/35 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        className={`relative flex h-7 w-7 items-center justify-center rounded-lg ${
          isPrimary
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-[14px] w-[14px]" strokeWidth={2.4} />
      </span>
      <span className="relative whitespace-nowrap text-[10px] font-bold leading-none">
        {action.label}
      </span>
    </motion.button>
  );
};

export const ActionGrid = ({ actions }: { actions: WalletAction[] }) => {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map((a, i) => (
        <div key={a.id} className="flex-1 min-w-[4.25rem]">
          <Tile action={a} index={i} />
        </div>
      ))}
    </div>
  );
};

/**
 * buildDefaultWalletActions — convenience preset matching the current
 * 4-action contract used by the Wallet page. Keeping it co-located makes
 * adding new actions a one-line change in the future.
 */
export const buildDefaultWalletActions = (cb: {
  onTopup: () => void;
  onTransfer: () => void;
  onJar: () => void;
  onPos: () => void;
}): WalletAction[] => [
  { id: "topup", label: "شحن الرصيد", icon: Plus, onClick: cb.onTopup, primary: true },
  { id: "transfer", label: "تحويل", icon: Send, onClick: cb.onTransfer },
  { id: "jar", label: "الحصّالة", icon: PiggyBank, onClick: cb.onJar },
  { id: "pos", label: "الدفع بالفرع", icon: ScanLine, onClick: cb.onPos },
];
