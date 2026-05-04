import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Send,
  Plus,
  ScanLine,
  Sparkles,
  Users,
  Target,
  PieChart as PieIcon,
  Wallet2,
  ArrowDownUp,
  Eye,
  EyeOff,
} from "lucide-react";

import { useWalletDashboard } from "@/features/wallet/hooks/useWalletDashboard";
import { useWalletAssets, type WalletAsset } from "@/features/wallet/hooks/useWalletAssets";
import { useHideBalance } from "@/features/wallet/hooks/useHideBalance";
import { useWalletTransactions } from "@/features/wallet/hooks/useWalletTransactions";
import { NeoCardsCarousel } from "@/features/wallet/components/NeoCardsCarousel";
import { WalletTopupDialog } from "@/features/wallet/components/WalletTopupDialog";
import { WalletTransferDialog } from "@/features/wallet/components/WalletTransferDialog";
import { WalletPosBarcode } from "@/features/wallet/components/WalletPosBarcode";
import { GameyasDockContent } from "@/features/wallet/components/GameyasDockContent";
import { OperationsDockContent } from "@/features/wallet/components/OperationsDockContent";
import { VaultsDockContent } from "@/features/wallet/components/VaultsDockContent";
import { InsightsDockContent } from "@/features/wallet/components/InsightsDockContent";
import { SavingsJarDialog } from "@/features/wallet/components/WalletSavingsJars";
import { WalletAssetConvertSheet } from "@/features/wallet/components/WalletAssetConvertSheet";

const Wallet = () => {
  const c = useWalletDashboard();
  const { assets, loading: assetsLoading } = useWalletAssets(c.userId);
  const { hidden, toggle: toggleHide } = useHideBalance(c.userId);
  const txnsData = useWalletTransactions(c.userId);
  const [activeAsset, setActiveAsset] = useState<WalletAsset | null>(null);
  const [dock, setDock] = useState<"ops" | "gameyas" | "vaults" | "insights">("ops");
  const [showConvert, setShowConvert] = useState(false);

  if (c.loading || assetsLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const ownerName = c.profile?.full_name || "عميل ريف";

  const savingsData = {
    jar: c.jar,
    jarTxs: c.jarTxs,
    setJar: c.setJar,
    setJarTxs: c.setJarTxs,
    loading: false,
  };

  const actions = [
    { id: "send", label: "إرسال", icon: Send, onClick: () => c.setShowTransfer(true) },
    { id: "topup", label: "إيداع", icon: Plus, onClick: c.openTopup },
    { id: "convert", label: "تحويل أصول", icon: ArrowDownUp, onClick: () => setShowConvert(true) },
    { id: "qr", label: "دفع QR", icon: ScanLine, onClick: () => c.setShowPos(true) },
    { id: "cashback", label: "كاش باك", icon: Sparkles, onClick: () => c.openAffiliateTab() },
  ];

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-24">
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 lg:px-8 pt-4">
        {/* HEADER */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              REEF · NEO BANK
            </p>
            <h1 className="font-display text-[28px] font-black tracking-tight mt-0.5 text-foreground">
              أهلاً، {ownerName.split(" ")[0]}
            </h1>
          </div>
          {activeAsset && (
            <motion.span
              layoutId="active-asset-badge"
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ring-primary/20"
            >
              {activeAsset.label}
            </motion.span>
          )}
        </motion.section>

        {/* SUPER-CARDS CAROUSEL (cards keep their own gradient) */}
        <div className="-mx-4 lg:-mx-8">
          <NeoCardsCarousel
            assets={assets}
            hidden={hidden}
            onToggleHide={toggleHide}
            ownerName={ownerName}
            onAssetChange={setActiveAsset}
          />
        </div>

        {/* QUICK-ACTION RIBBON */}
        <div className="grid grid-cols-5 gap-2">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={a.onClick}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card text-card-foreground px-2 py-3 ring-1 ring-border/50 shadow-sm active:scale-[0.96] transition"
            >
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary group-active:bg-primary group-active:text-primary-foreground transition">
                <a.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10.5px] font-bold text-foreground/80">{a.label}</span>
            </button>
          ))}
        </div>

        {/* MINI-APP DOCK */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted/30 p-1 ring-1 ring-border/40">
          {[
            { id: "ops", label: "العمليات", icon: Wallet2 },
            { id: "gameyas", label: "الجمعيات", icon: Users },
            { id: "vaults", label: "حصّالاتي", icon: Target },
            { id: "insights", label: "تحليلات", icon: PieIcon },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDock(t.id as typeof dock)}
              className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold transition ${
                dock === t.id
                  ? "bg-background text-foreground ring-1 ring-border/50 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
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
              <OperationsDockContent userId={c.userId} />
            ) : dock === "gameyas" ? (
              <GameyasDockContent userId={c.userId} />
            ) : dock === "vaults" ? (
              <VaultsDockContent userId={c.userId} onOpenSettings={() => c.setShowJar(true)} />
            ) : (
              <InsightsDockContent userId={c.userId} />
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
            name={ownerName}
            balance={Number(c.balance?.balance ?? 0)}
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

export default Wallet;
