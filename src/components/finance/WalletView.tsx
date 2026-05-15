import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Send,
  Plus,
  ScanLine,
  HandHeart,
  Users,
  Target,
  PieChart as PieIcon,
  Wallet2,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

import { useWalletDashboard } from "@/core/finance/hooks/useWalletDashboard";
import { useWalletAssets } from "@/core/finance/hooks/useWalletAssets";
import { useHideBalance } from "@/core/finance/hooks/useHideBalance";
import { useWalletTransactions } from "@/core/finance/hooks/useWalletTransactions";
import { WalletTopupDialog } from "@/components/finance/WalletTopupDialog";
import { WalletTransferDialog } from "@/components/finance/WalletTransferDialog";
import { WalletPosBarcode } from "@/components/finance/WalletPosBarcode";
import { WalletCharityHub } from "@/components/finance/WalletCharityHub";
import { GameyasDockContent } from "@/components/finance/GameyasDockContent";
import { OperationsDockContent } from "@/components/finance/OperationsDockContent";
import { VaultsDockContent } from "@/components/finance/VaultsDockContent";
import { InsightsDockContent } from "@/components/finance/InsightsDockContent";
import { SavingsJarDialog } from "@/components/finance/WalletSavingsJars";
import { toLatin } from "@/lib/format";
import { FloatingGuardian } from "@/components/hakim/FloatingGuardian";
import { Button } from "@/components/ui/button";

type DockKey = "ops" | "gameyas" | "vaults" | "insights" | "charity" | "family";

/**
 * Phase 59 — Tayseer Sovereign Wallet.
 *
 *   • Header surfaces the user's 6-digit Tayseer Short ID — the sovereign
 *     identity binding the customer to the ledger.
 *   • UnifiedBalanceCard: glassmorphism shell on `--card` + `--primary`
 *     primitives — no hardcoded gradients, no rose/amber/emerald literals.
 *   • QuickActionHUD: four sovereign actions (ادفع · اشحن · حوّل · تبرع).
 *   • Transactions read from the SOVEREIGN LEDGER (`ledger_entries` via
 *     `useWalletTransactions`) — `wallet_transactions` is no longer touched.
 */
const Wallet = () => {
  const c = useWalletDashboard();
  const { assets, loading: assetsLoading } = useWalletAssets(c.userId);
  const { hidden, toggle: toggleHide } = useHideBalance(c.userId);
  const txnsData = useWalletTransactions(c.userId);
  const navigate = useNavigate();
  const [dock, setDock] = useState<DockKey>("ops");

  if (c.loading || assetsLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const ownerName = c.profile?.full_name || "عميل ريف";
  const shortId = c.profile?.short_id || null;
  const totalBalance = Number(c.balance?.balance ?? 0);

  const savingsData = {
    jar: c.jar,
    jarTxs: c.jarTxs,
    setJar: c.setJar,
    setJarTxs: c.setJarTxs,
    loading: false,
  };

  const actions = [
    { id: "pay", label: "ادفع", icon: ScanLine, onClick: () => c.setShowPos(true) },
    { id: "topup", label: "اشحن", icon: Plus, onClick: c.openTopup },
    { id: "transfer", label: "حوّل", icon: Send, onClick: () => c.setShowTransfer(true) },
    { id: "donate", label: "تبرّع", icon: HandHeart, onClick: () => setDock("charity") },
  ];

  const docks: { id: DockKey; label: string; icon: typeof Wallet2 }[] = [
    { id: "ops", label: "العمليات", icon: Wallet2 },
    { id: "gameyas", label: "الجمعيات", icon: Users },
    { id: "family", label: "الأسرة", icon: Users },
    { id: "vaults", label: "حصّالاتي", icon: Target },
    { id: "insights", label: "تحليلات", icon: PieIcon },
  ];

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-24">
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 lg:px-8 pt-4">
        {/* SOVEREIGN HEADER */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              تيسير · المحفظة السيادية
            </p>
            {shortId && (
              <p className="mt-0.5 text-[11px] font-bold text-muted-foreground tabular-nums tracking-wider">
                <span className="text-primary">ID</span> · {toLatin(shortId)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FloatingGuardian workspace="wallet" inline />
            <Button
              type="button"
              onClick={toggleHide}
              aria-label={hidden ? "إظهار الرصيد" : "إخفاء الرصيد"}
              className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground ring-1 ring-border/50 shadow-sm active:scale-95 transition"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </motion.section>

        {/* UNIFIED BALANCE CARD — glassmorphism on tokens */}
        <UnifiedBalanceCard
          balance={totalBalance}
          hidden={hidden}
          shortId={shortId}
          ownerName={ownerName}
        />

        {/* QUICK ACTION HUD — 4 large rounded sovereign buttons */}
        <div className="grid grid-cols-4 gap-2.5">
          {actions.map((a) => (
            <Button
              key={a.id}
              type="button"
              onClick={a.onClick}
              className="group flex flex-col items-center justify-center gap-1.5 rounded-[20px] bg-secondary text-secondary-foreground hover:bg-secondary/80 py-3.5 shadow-sm ring-1 ring-border active:scale-95 transition"
            >
              <a.icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
              <span className="text-[11px] font-extrabold">{a.label}</span>
            </Button>
          ))}
        </div>

        {/* AFFILIATE PROMOTION — sovereign tokenized banner */}
        <Link
          to="/affiliate"
          className="flex items-center justify-between rounded-2xl bg-card text-card-foreground p-3 shadow-sm ring-1 ring-border active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12.5px] font-extrabold">برنامج الإحالة السيادي</p>
              <p className="text-[10.5px] text-muted-foreground">اربح عمولة على كل دعوة ناجحة</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-primary">افتح ←</span>
        </Link>

        {/* MINI-APP DOCK */}
        <div className="grid grid-cols-5 gap-1 rounded-2xl bg-muted/30 p-1 ring-1 ring-border/40">
          {docks.map((t) => (
            <Button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === "family") {
                  navigate({ to: "/family" });
                } else {
                  setDock(t.id);
                }
              }}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition ${
                dock === t.id
                  ? "bg-background text-foreground ring-1 ring-border/50 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {/* DOCK CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dock}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {dock === "ops" ? (
              <OperationsDockContent userId={c.userId} data={txnsData} />
            ) : dock === "gameyas" ? (
              <GameyasDockContent userId={c.userId} />
            ) : dock === "vaults" ? (
              <VaultsDockContent
                userId={c.userId}
                onOpenSettings={() => c.setShowJar(true)}
                data={savingsData}
              />
            ) : dock === "charity" ? (
              <WalletCharityHub walletBalance={totalBalance} />
            ) : (
              <InsightsDockContent userId={c.userId} data={txnsData} appSpend={c.appSpend} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* SHEETS */}
      <AnimatePresence>
        {c.showTopup && (
          <WalletTopupDialog
            onClose={() => c.setShowTopup(false)}
            phone="201080068689"
            userId={c.userId!}
          />
        )}
        {c.showTransfer && (
          <WalletTransferDialog
            onClose={() => c.setShowTransfer(false)}
            balance={totalBalance}
            onDone={(newBal) =>
              c.setBalance((b) => (b ? { ...b, balance: newBal } : b))
            }
          />
        )}
        {c.showPos && (
          <WalletPosBarcode
            onClose={() => c.setShowPos(false)}
            customerCode={c.customerCode}
            name={ownerName}
            balance={totalBalance}
            points={c.balance?.points ?? 0}
          />
        )}
        {c.showJar && c.userId && c.jar && (
          <SavingsJarDialog
            onClose={() => c.setShowJar(false)}
            userId={c.userId}
            jar={c.jar}
            txs={c.jarTxs}
            onUpdate={(j, t) => {
              c.setJar(j);
              c.setJarTxs(t);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * UnifiedBalanceCard — Tayseer Sovereign hero card.
 * Pure glass: layered `--card`, `--primary` glow, "Tayseer Secured" shield.
 * Renders the Short ID masked as ○ ○ ○ ○ ##### for trust + privacy.
 */
const UnifiedBalanceCard = ({
  balance,
  hidden,
  shortId,
  ownerName,
}: {
  balance: number;
  hidden: boolean;
  shortId: string | null;
  ownerName: string;
}) => {
  const masked = shortId
    ? `○ ○ ${toLatin(shortId.slice(-4).padStart(4, "0"))}`
    : "○ ○ ○ ○";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="relative overflow-hidden rounded-3xl bg-card text-card-foreground p-7 sm:p-8 shadow-md ring-1 ring-border"
    >
      {/* soft adaptive glow */}
      <div className="pointer-events-none absolute -top-20 -end-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -start-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            الرصيد الكلي
          </p>
          <p className="mt-2 font-display text-6xl sm:text-7xl font-black tabular-nums leading-none text-foreground">
            {hidden ? "•••••" : toLatin(balance.toLocaleString("en-US"))}
            <span className="ms-2 align-top text-base font-bold text-primary">
              ج.م
            </span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-primary/20">
          <ShieldCheck className="h-3 w-3" />
          مؤمَّنة بـ تيسير
        </span>
      </div>

      <div className="relative mt-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            معرّف تيسير السيادي
          </p>
          <p className="mt-1 font-mono text-base font-black tabular-nums tracking-[0.2em] text-primary">
            {masked}
          </p>
        </div>
        <p className="text-[11px] font-extrabold text-foreground/80 truncate max-w-[55%] text-end">
          {ownerName}
        </p>
      </div>
    </motion.div>
  );
};

export default Wallet;
