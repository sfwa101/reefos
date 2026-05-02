import { motion } from "framer-motion";
import { Plus, Send, PiggyBank, ScanLine, type LucideIcon } from "lucide-react";

/**
 * ActionGrid — Papara-style glassmorphism action row.
 *
 * 4 themed glass tiles wired to the wallet modals (top-up, transfer,
 * savings jar, in-branch POS). Pure / dumb: receives plain callbacks,
 * uses only theme tokens so it adapts to the active theme.
 */

type Action = {
  id: "topup" | "transfer" | "jar" | "pos";
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

const Tile = ({ action, index }: { action: Action; index: number }) => {
  const Icon = action.icon;
  return (
    <motion.button
      type="button"
      onClick={action.onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-background/50 px-2 py-4 ring-1 ring-border/50 backdrop-blur-xl transition active:scale-95"
    >
      {/* glass highlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-foreground/5 to-transparent"
      />
      {/* hover accent halo */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 ring-2 ring-primary/30 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
      </span>
      <span className="relative text-[11px] font-extrabold leading-none text-foreground">
        {action.label}
      </span>
    </motion.button>
  );
};

export const ActionGrid = ({
  onTopup,
  onTransfer,
  onJar,
  onPos,
}: {
  onTopup: () => void;
  onTransfer: () => void;
  onJar: () => void;
  onPos: () => void;
}) => {
  const actions: Action[] = [
    { id: "topup", label: "شحن الرصيد", icon: Plus, onClick: onTopup },
    { id: "transfer", label: "تحويل", icon: Send, onClick: onTransfer },
    { id: "jar", label: "الحصّالة", icon: PiggyBank, onClick: onJar },
    { id: "pos", label: "الدفع بالفرع", icon: ScanLine, onClick: onPos },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {actions.map((a, i) => (
        <Tile key={a.id} action={a} index={i} />
      ))}
    </div>
  );
};
