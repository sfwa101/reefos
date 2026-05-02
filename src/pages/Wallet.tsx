import {
  Heart,
  Loader2,
  PieChart as PieIcon,
  Users,
  Wallet2,
  PiggyBank,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toLatin } from "@/lib/format";

import { useWalletDashboard } from "@/features/wallet/hooks/useWalletDashboard";
import { BalanceCardsCarousel } from "@/features/wallet/components/BalanceCardsCarousel";
import {
  ActionGrid,
  buildDefaultWalletActions,
} from "@/features/wallet/components/ActionGrid";
import { WalletTabs } from "@/features/wallet/components/WalletTabs";
import { MiniStatGrid } from "@/features/wallet/components/WalletActionGrid";
import { WalletTransactionList } from "@/features/wallet/components/WalletTransactionList";
import {
  SavingsJarTile,
  SavingsJarDialog,
} from "@/features/wallet/components/WalletSavingsJars";
import {
  SpendingDonut,
  AIAdvisor,
  BudgetTracker,
} from "@/features/wallet/components/WalletAnalytics";
import { WalletAffiliateHub } from "@/features/wallet/components/WalletAffiliateHub";
import { WalletTopupDialog } from "@/features/wallet/components/WalletTopupDialog";
import { WalletTransferDialog } from "@/features/wallet/components/WalletTransferDialog";
import { WalletPosBarcode } from "@/features/wallet/components/WalletPosBarcode";
import { WalletCharityHub } from "@/features/wallet/components/WalletCharityHub";

/**
 * Wallet — Phase B Fintech overhaul.
 *
 * Layout choreography:
 *   1. Theme-bound vertical gradient background (`from-background via-background/95 to-muted/20`).
 *   2. Generous spatial rhythm (`gap-6`, `px-5`) — luxury negative space.
 *   3. Holographic super-card → extensible glass action strip → animated
 *      segmented control → "The Vault" sheet anchored at the bottom.
 *
 * Logic untouched: every modal trigger and slice still consumes the same
 * `useWalletDashboard` facade.
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

  const actions = buildDefaultWalletActions({
    onTopup: c.openTopup,
    onTransfer: () => c.setShowTransfer(true),
    onJar: () => c.setShowJar(true),
    onPos: () => c.setShowPos(true),
  });

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-background via-background/95 to-muted/20">
      {/* Ambient theme glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 right-0 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 pt-3 pb-32">
        {/* HEADER */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between px-5"
        >
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
              محفظتي
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              بنكك الرقمي · مدير ميزانياتك · شركاء النجاح
            </p>
          </div>
          {c.tier && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold text-primary ring-1 ring-primary/20">
              {c.tier.label} · {toLatin(c.tier.multiplier)}x
            </span>
          )}
        </motion.section>

        {/* SWIPEABLE SUPER-CARDS CAROUSEL (full-bleed) */}
        <BalanceCardsCarousel
          name={c.profile?.full_name || "عميل ريف"}
          balance={Number(c.balance?.balance ?? 0)}
          trustLimit={c.trustLimit}
          tierLabel={c.tier?.label}
          totalCommission={c.totalCommission}
          successfulRefs={c.successfulRefs}
          referralCode={c.referralCode}
          jar={c.jar}
        />

        {/* COMPACT GLASS ACTION RIBBON */}
        <div className="px-5">
          <ActionGrid actions={actions} />
        </div>

        {/* ANIMATED SEGMENTED CONTROL */}
        <div className="px-5">
          <WalletTabs
          tabs={[
            { id: "balance", label: "العمليات", icon: Wallet2 },
            { id: "budgets", label: "التحليلات", icon: PieIcon },
            { id: "savings", label: "الحصّالة", icon: PiggyBank },
            { id: "charity", label: "الصدقات", icon: Heart },
            { id: "affiliate", label: "شركاء النجاح", icon: Users },
          ]}
          active={c.tab}
          onChange={(t) => {
            if (t === "affiliate") c.openAffiliateTab();
            else c.setTab(t as typeof c.tab);
          }}
        />
        </div>

        <div className="px-5">
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

          {c.tab === "budgets" && (
            <motion.div
              key="budgets"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
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

          {c.tab === "savings" && (
            <motion.div
              key="savings"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <SavingsJarTile jar={c.jar} onOpen={() => c.setShowJar(true)} />
            </motion.div>
          )}

          {c.tab === "charity" && (
            <motion.div
              key="charity"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <WalletCharityHub walletBalance={Number(c.balance?.balance ?? 0)} />
            </motion.div>
          )}

          {c.tab === "affiliate" && (
            <motion.div
              key="affiliate"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25 }}
            >
              <WalletAffiliateHub
                userId={c.userId}
                code={c.referralCode}
                referrals={c.referrals}
                totalCommission={c.totalCommission}
                successfulRefs={c.successfulRefs}
                onEnsureCode={c.ensureReferralCode}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <AnimatePresence>

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
