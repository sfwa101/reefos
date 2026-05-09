import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Recycle,
  ShoppingBag,
  Sparkles,
  Wallet2,
  type LucideIcon,
} from "lucide-react";
import { toLatin } from "@/lib/format";
import { useWalletTransactions, type WalletTxn } from "../hooks/useWalletTransactions";

/**
 * OperationsDockContent — Apple-Wallet-style unified ledger.
 *
 * Lists `wallet_transactions` for the current user, grouped by day
 * (اليوم / أمس / dd MMM yyyy). 100% theme-token driven.
 *
 * Visual rules:
 *  - Positive amounts: text-credit + leading + sign.
 *  - Negative / debit:  text-foreground + leading − sign.
 *  - Each row uses bg-card / ring-border / text-foreground.
 */
export const OperationsDockContent = ({
  userId,
  data,
}: {
  userId: string | null;
  data?: ReturnType<typeof useWalletTransactions>;
}) => {
  const fallback = useWalletTransactions(data ? null : userId);
  const { groups, loading, rows } = data ?? fallback;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-card text-card-foreground ring-1 ring-border/50 shadow-sm p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wallet2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-extrabold text-foreground">لا توجد عمليات بعد</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ستظهر هنا كل تحويلاتك ومشترياتك ومكافآتك.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4 max-h-[60vh] overflow-y-auto pr-0.5 scroll-smooth"
    >
      {groups.map((g) => (
        <section key={g.key}>
          <header className="mb-1.5 flex items-center justify-between px-1">
            <h5 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {g.label}
            </h5>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {toLatin(g.items.length)}
            </span>
          </header>
          <ul className="overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-border/50 shadow-sm divide-y divide-border/40">
            {g.items.map((t) => (
              <TxnRow key={t.id} txn={t} />
            ))}
          </ul>
        </section>
      ))}
    </motion.div>
  );
};

const iconForTxn = (t: WalletTxn): { Icon: LucideIcon; tone: "in" | "out" | "shop" | "circle" | "reward" } => {
  const k = (t.kind ?? "").toLowerCase();
  const s = (t.source ?? "").toLowerCase();
  if (k.includes("topup") || k.includes("deposit") || k.includes("credit")) return { Icon: ArrowDownLeft, tone: "in" };
  if (k.includes("order") || s.includes("pos") || s.includes("checkout")) return { Icon: ShoppingBag, tone: "shop" };
  if (k.includes("gam") || k.includes("circle")) return { Icon: Recycle, tone: "circle" };
  if (k.includes("cashback") || k.includes("reward") || k.includes("bonus")) return { Icon: Sparkles, tone: "reward" };
  if (t.amount > 0) return { Icon: ArrowDownLeft, tone: "in" };
  return { Icon: ArrowUpRight, tone: "out" };
};

const toneClasses: Record<string, string> = {
  in: "bg-credit/10 text-credit",
  out: "bg-muted text-foreground",
  shop: "bg-primary/10 text-primary",
  circle: "bg-primary/10 text-primary",
  reward: "bg-premium/10 text-premium",
};

const TxnRow = ({ txn }: { txn: WalletTxn }) => {
  const { Icon, tone } = iconForTxn(txn);
  const positive = Number(txn.amount) >= 0;
  const time = new Date(txn.created_at).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center gap-3 px-3.5 py-3 transition active:bg-muted/40">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-foreground">
          {txn.label || txn.kind || "عملية"}
        </p>
        <p className="text-[10.5px] text-muted-foreground tabular-nums">
          {time} · {txn.status === "approved" ? "مكتملة" : txn.status === "pending" ? "قيد المراجعة" : txn.status}
        </p>
      </div>
      <span
        className={`font-display text-sm font-black tabular-nums ${
          positive ? "text-credit" : "text-foreground"
        }`}
      >
        {positive ? "+" : "−"}
        {toLatin(Math.abs(Number(txn.amount)))}
        <span className="ms-1 text-[9.5px] font-bold opacity-60">ج</span>
      </span>
    </li>
  );
};
