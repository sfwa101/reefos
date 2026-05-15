import { motion } from "framer-motion";
import { toLatin } from "@/lib/format";
import { formatDate, iconFor, isPositive } from "@/core/finance/lib/walletAdvisor";
import type { Tx } from "@/core/finance/types/wallet.types";
import { Button } from "@/components/ui/button";

/**
 * WalletTransactionList — "The Vault" sheet.
 *
 * Container styled as an oversized rounded-top sheet that anchors to the
 * bottom of the wallet flow. Positive amounts use `text-success` with a
 * leading "+", debits use `text-destructive`. Theme-only colors.
 */
export const WalletTransactionList = ({ txs }: { txs: Tx[] }) => (
  <section className="-mx-5 mt-2 rounded-t-[2.5rem] bg-card px-5 pb-6 pt-6 shadow-[0_-12px_40px_-20px_hsl(var(--foreground)/0.18)] ring-1 ring-border/60">
    {/* Drag-handle indicator */}
    <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/25" />

    <div className="mb-3 flex items-baseline justify-between">
      <div>
        <h2 className="font-display text-lg font-black tracking-tight">
          سجل المعاملات
        </h2>
        <p className="text-[11px] text-muted-foreground">آخر العمليات على محفظتك</p>
      </div>
      <Button className="text-[11px] font-bold text-primary hover:underline">
        عرض الكل
      </Button>
    </div>

    {txs.length === 0 ? (
      <div className="rounded-2xl bg-muted/30 p-10 text-center text-xs text-muted-foreground ring-1 ring-border/40">
        لا توجد عمليات بعد
      </div>
    ) : (
      <div className="divide-y divide-border/50 rounded-2xl bg-background/40 ring-1 ring-border/40">
        {txs.slice(0, 8).map((t, i) => {
          const Icon = iconFor(t.kind);
          const pos = isPositive(t.kind);
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${
                  pos
                    ? "bg-success/10 text-success ring-success/20"
                    : "bg-destructive/10 text-destructive ring-destructive/20"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(t.created_at)}
                </p>
              </div>
              <span
                className={`font-display text-base font-black tabular-nums ${
                  pos ? "text-success" : "text-destructive"
                }`}
              >
                {pos ? "+" : "−"}
                {toLatin(Math.round(Math.abs(t.amount)))}
                <span className="ms-1 text-[10px] font-bold opacity-70">ج</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    )}
  </section>
);
