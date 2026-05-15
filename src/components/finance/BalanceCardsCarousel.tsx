import { motion } from "framer-motion";
import { Copy, PiggyBank, Target, Users, Wallet2 } from "lucide-react";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import { BalanceCard } from "./BalanceCard";
import type { SavingsJar } from "@/core/finance/types/wallet.types";
import { Button } from "@/components/ui/button";

/**
 * BalanceCardsCarousel — Native-style horizontal snap carousel of
 * three Super-Cards (Balance · Affiliate · Savings).
 *
 * Uses native browser scroll (`overflow-x-auto snap-x snap-mandatory`)
 * for buttery 60fps with zero JS scroll handlers.
 */
export const BalanceCardsCarousel = ({
  name,
  balance,
  trustLimit,
  tierLabel,
  totalCommission,
  successfulRefs,
  referralCode,
  jar,
  userId,
}: {
  name: string;
  balance: number;
  trustLimit: number;
  tierLabel?: string;
  totalCommission: number;
  successfulRefs: number;
  referralCode: string | null;
  jar: SavingsJar | null;
  userId: string | null;
}) => {
  const copyCode = async () => {
    if (!referralCode) {
      toast.error("لا يوجد كود دعوة بعد");
      return;
    }
    await navigator.clipboard.writeText(referralCode);
    toast.success("تم نسخ كود الدعوة");
  };

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ scrollPaddingInline: "1rem" }}
    >
      {/* 1. Holographic balance */}
      <div className="w-[88vw] max-w-md shrink-0 snap-center">
        <BalanceCard
          name={name}
          balance={balance}
          trustLimit={trustLimit}
          tierLabel={tierLabel}
          userId={userId}
        />
      </div>

      {/* 2. Affiliate card */}
      <div className="w-[88vw] max-w-md shrink-0 snap-center">
        <AffiliateCard
          totalCommission={totalCommission}
          successfulRefs={successfulRefs}
          referralCode={referralCode}
          onCopy={copyCode}
        />
      </div>

      {/* 3. Savings jar card */}
      <div className="w-[88vw] max-w-md shrink-0 snap-center">
        <SavingsCard jar={jar} />
      </div>
    </div>
  );
};

/* ----------------------------- Affiliate ----------------------------- */

const AffiliateCard = ({
  totalCommission,
  successfulRefs,
  referralCode,
  onCopy,
}: {
  totalCommission: number;
  successfulRefs: number;
  referralCode: string | null;
  onCopy: () => void;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 18, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    style={{ aspectRatio: "1.586 / 1" }}
    className="relative w-full overflow-hidden rounded-[2rem] bg-accent text-accent-foreground shadow-2xl ring-1 ring-border/40"
  >
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent via-accent to-primary opacity-95" />
    <div className="pointer-events-none absolute -top-16 -left-12 h-52 w-52 rounded-full bg-primary/35 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-accent-foreground/15 blur-3xl" />

    <div className="relative flex h-full flex-col justify-between p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-foreground/15 ring-1 ring-accent-foreground/25 backdrop-blur-sm">
            <Users className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold tracking-[0.22em] text-accent-foreground/85">
              REEF · PARTNERS
            </p>
            <p className="text-[9px] font-extrabold tracking-wide">
              شركاء النجاح
            </p>
          </div>
        </div>
        <div className="rounded-full bg-accent-foreground/15 px-2.5 py-1 ring-1 ring-accent-foreground/25 backdrop-blur-sm">
          <span className="text-[10px] font-extrabold tabular-nums">
            {toLatin(successfulRefs)} مسجّل
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground/75">
          إجمالي الكاش باك
        </p>
        <motion.p
          key={totalCommission}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl font-black leading-none tracking-tight tabular-nums"
        >
          {toLatin(Math.round(totalCommission))}
          <span className="ms-2 align-top text-lg font-bold text-accent-foreground/75">
            ج.م
          </span>
        </motion.p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-accent-foreground/65">
            كود الدعوة
          </p>
          <p className="truncate font-display text-base font-extrabold tracking-[0.18em]">
            {referralCode ?? "—"}
          </p>
        </div>
        <Button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1.5 rounded-full bg-accent-foreground/15 px-3 py-1.5 ring-1 ring-accent-foreground/25 backdrop-blur-sm transition active:scale-95"
        >
          <Copy className="h-3 w-3" />
          <span className="text-[10px] font-extrabold">نسخ</span>
        </Button>
      </div>
    </div>
  </motion.section>
);

/* ------------------------------ Savings ------------------------------ */

const SavingsCard = ({ jar }: { jar: SavingsJar | null }) => {
  const balance = Number(jar?.balance ?? 0);
  const goal = jar?.goal ? Number(jar.goal) : null;
  const goalLabel = jar?.goal_label ?? null;
  const pct = goal && goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ aspectRatio: "1.586 / 1" }}
      className="relative w-full overflow-hidden rounded-[2rem] bg-secondary text-secondary-foreground shadow-2xl ring-1 ring-border/40"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/40 opacity-95" />
      <div className="pointer-events-none absolute -top-20 -right-14 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/10 ring-1 ring-foreground/15 backdrop-blur-sm">
              <PiggyBank className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold tracking-[0.22em] text-secondary-foreground/85">
                REEF · SAVINGS
              </p>
              <p className="text-[9px] font-extrabold tracking-wide">
                الحصّالة الذكية
              </p>
            </div>
          </div>
          {jar?.auto_save_enabled && (
            <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-extrabold text-primary ring-1 ring-primary/30 backdrop-blur-sm">
              تلقائي
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground/75">
            الرصيد المدّخر
          </p>
          <motion.p
            key={balance}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-black leading-none tracking-tight tabular-nums"
          >
            {toLatin(Math.round(balance))}
            <span className="ms-2 align-top text-lg font-bold text-secondary-foreground/75">
              ج.م
            </span>
          </motion.p>
        </div>

        <div className="space-y-1.5">
          {goal && pct !== null ? (
            <>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="flex items-center gap-1 text-secondary-foreground/75">
                  <Target className="h-3 w-3" />
                  {goalLabel || "الهدف"}
                </span>
                <span className="tabular-nums">
                  {toLatin(pct)}٪ · {toLatin(Math.round(goal))} ج
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary-foreground/70">
              <Wallet2 className="h-3 w-3" />
              <span>لم تُحدّد هدفاً بعد — اضغط الحصّالة لإدارة الادّخار</span>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
};
