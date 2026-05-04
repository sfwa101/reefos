import {
  Loader2,
  PieChart as PieIcon,
  Users,
  Wallet2,
  Target,
  Send,
  Plus,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toLatin } from "@/lib/format";

import { useWalletDashboard } from "@/features/wallet/hooks/useWalletDashboard";
import { BalanceCardsCarousel } from "@/features/wallet/components/BalanceCardsCarousel";
import { ActionGrid, type WalletAction } from "@/features/wallet/components/ActionGrid";
import { WalletTabs } from "@/features/wallet/components/WalletTabs";
import { MiniStatGrid } from "@/features/wallet/components/WalletActionGrid";
import { WalletTransactionList } from "@/features/wallet/components/WalletTransactionList";
import { SavingsJarDialog } from "@/features/wallet/components/WalletSavingsJars";
import {
  SpendingDonut,
  AIAdvisor,
  BudgetTracker,
} from "@/features/wallet/components/WalletAnalytics";
import { WalletTopupDialog } from "@/features/wallet/components/WalletTopupDialog";
import { WalletTransferDialog } from "@/features/wallet/components/WalletTransferDialog";
import { WalletPosBarcode } from "@/features/wallet/components/WalletPosBarcode";
import { GameyasTab } from "@/features/wallet/components/GameyasTab";
import { VaultsGrid } from "@/features/wallet/components/VaultsGrid";
import { NetWorthCard } from "@/features/wallet/components/NetWorthCard";

/**
 * Wallet — Phase 13.16 Halal Neo-Bank rebuild.
 *
 * 4-segment hierarchy (Mobile-first, edge-safe `px-4 lg:px-8`):
 *   1. Holographic IBAN super-card carousel.
 *   2. Fintech action ribbon (Send · Topup · Cashback · QR Pay).
 *   3. Segmented control: العمليات · الجمعيات · حصّالاتي · تحليلات.
 *   4. Personal CFO panel (NetWorth + SpendingDonut + AIAdvisor).
 */
const Wallet = () => {
  const c = useWalletDashboard();

  if (c.loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const actions: WalletAction[] = [
    {
      id: "transfer",
      label: "إرسال",
      icon: Send,
      onClick: () => c.setShowTransfer(true),
      primary: true,
    },
    { id: "topup", label: "إيداع", icon: Plus, onClick: c.openTopup },
    {
      id: "cashback",
      label: "كاش باك",
      icon: Sparkles,
      onClick: () => c.openAffiliateTab(),
    },
    { id: "qr", label: "دفع QR", icon: ScanLine, onClick: () => c.setShowPos(true) },
  ];

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-background via-background/95 to-muted/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 right-0 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 lg:px-8 pt-3 pb-32">
        {/* HEADER */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
              محفظتي
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              بنكك الرقمي الإسلامي · جمعيات · حصّالات · مدير مالي شخصي
            </p>
          </div>
          {c.tier && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary ring-1 ring-primary/20">
              {c.tier.label} · {toLatin(c.tier.multiplier)}x
            </span>
          )}
        </motion.section>

        {/* SUPER-CARDS CAROUSEL */}
        <div className="-mx-4 lg:-mx-8">
          <BalanceCardsCarousel
            name={c.profile?.full_name || "عميل ريف"}
            balance={Number(c.balance?.balance ?? 0)}
            trustLimit={c.trustLimit}
            tierLabel={c.tier?.label}
            totalCommission={c.totalCommission}
            successfulRefs={c.successfulRefs}
            referralCode={c.referralCode}
            jar={c.jar}
            userId={c.userId}
          />
        </div>

        {/* FINTECH ACTION RIBBON */}
        <ActionGrid actions={actions} />

        {/* 4-SEGMENT NAV */}
        <WalletTabs
          tabs={[
            { id: "balance", label: "العمليات", icon: Wallet2 },
            { id: "gameyas", label: "الجمعيات", icon: Users },
            { id: "vaults", label: "حصّالاتي", icon: Target },
            { id: "budgets", label: "تحليلات", icon: PieIcon },
          ]}
          active={c.tab}
          onChange={(t) => c.setTab(t as typeof c.tab)}
        />

        <AnimatePresence mode="wait">
          {c.tab === "balance" && (
            <motion.div
              key="balance"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <MiniStatGrid
                coupons={c.balance?.coupons ?? 0}
                cashback={c.balance?.cashback ?? 0}
                refs={c.successfulRefs}
              />
              <WalletTransactionList txs={c.txs} />
            </motion.div>
          )}

          {c.tab === "gameyas" && (
            <motion.div
              key="gameyas"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <GameyasTab userId={c.userId} />
            </motion.div>
          )}

          {c.tab === "vaults" && (
            <motion.div
              key="vaults"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <VaultsGrid userId={c.userId} />
            </motion.div>
          )}

          {c.tab === "budgets" && (
            <motion.div
              key="budgets"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <NetWorthCard
                walletBalance={Number(c.balance?.balance ?? 0)}
                userId={c.userId}
              />
              <SpendingDonut stats={c.categoryStats} />
              <AIAdvisor monthByCat={c.monthByCat} budgets={c.budgets} />
              <BudgetTracker
                userId={c.userId!}
                monthByCat={c.monthByCat}
                budgets={c.budgets}
                onChange={c.setBudgets}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {c.showTopup && (
            <WalletTopupDialog
              onClose={() => c.setShowTopup(false)}
              phone="201080068689"
              userId={c.userId!}
            />
          )}
          {c.showJar && c.jar && (
            <SavingsJarDialog
              onClose={() => c.setShowJar(false)}
              userId={c.userId!}
              jar={c.jar}
              txs={c.jarTxs}
              onUpdate={(j, t) => {
                c.setJar(j);
                c.setJarTxs(t);
              }}
            />
          )}
          {c.showTransfer && (
            <WalletTransferDialog
              onClose={() => c.setShowTransfer(false)}
              balance={Number(c.balance?.balance ?? 0)}
              onDone={(newBal) =>
                c.setBalance((b) => (b ? { ...b, balance: newBal } : b))
              }
            />
          )}
          {c.showPos && (
            <WalletPosBarcode
              onClose={() => c.setShowPos(false)}
              customerCode={c.customerCode}
              name={c.profile?.full_name || "عميل ريف"}
              balance={Number(c.balance?.balance ?? 0)}
              points={c.balance?.points ?? 0}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Wallet;
