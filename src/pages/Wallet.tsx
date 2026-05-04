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
} from "lucide-react";

import { useWalletDashboard } from "@/features/wallet/hooks/useWalletDashboard";
import { useWalletAssets, type WalletAsset } from "@/features/wallet/hooks/useWalletAssets";
import { useHideBalance } from "@/features/wallet/hooks/useHideBalance";
import { NeoCardsCarousel } from "@/features/wallet/components/NeoCardsCarousel";
import { WalletTopupDialog } from "@/features/wallet/components/WalletTopupDialog";
import { WalletTransferDialog } from "@/features/wallet/components/WalletTransferDialog";
import { WalletPosBarcode } from "@/features/wallet/components/WalletPosBarcode";
import { GameyasDockContent } from "@/features/wallet/components/GameyasDockContent";

/**
 * Wallet — Phase 13.34 Neo-Bank rebuild (shell only).
 *
 * Hierarchy (mobile-first, edge-safe):
 *   1. Stealth-aware greeting + active-asset badge.
 *   2. Embla horizontal Super-Cards (5 assets) with shared layoutId.
 *   3. Quick-action ribbon (Send · Topup · Convert · QR · Cashback).
 *   4. Mini-app dock (Operations · Gameyas · Vaults · Insights) — placeholders.
 *   5. Existing Topup/Transfer/POS sheets re-skinned in dark surface.
 */
const Wallet = () => {
  const c = useWalletDashboard();
  const { assets, loading: assetsLoading } = useWalletAssets(c.userId);
  const { hidden, toggle: toggleHide } = useHideBalance(c.userId);
  const [activeAsset, setActiveAsset] = useState<WalletAsset | null>(null);
  const [dock, setDock] = useState<"ops" | "gameyas" | "vaults" | "insights">("ops");

  if (c.loading || assetsLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const ownerName = c.profile?.full_name || "عميل ريف";

  const actions = [
    { id: "send", label: "إرسال", icon: Send, onClick: () => c.setShowTransfer(true) },
    { id: "topup", label: "إيداع", icon: Plus, onClick: c.openTopup },
    { id: "convert", label: "تحويل أصول", icon: ArrowDownUp, onClick: () => {} },
    { id: "qr", label: "دفع QR", icon: ScanLine, onClick: () => c.setShowPos(true) },
    { id: "cashback", label: "كاش باك", icon: Sparkles, onClick: () => c.openAffiliateTab() },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[oklch(0.16_0.02_260)] text-white">
      {/* aurora background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 0%, oklch(0.45 0.18 280 / 0.55), transparent 70%), radial-gradient(50% 40% at 80% 10%, oklch(0.55 0.18 165 / 0.40), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 lg:px-8 pt-4 pb-32">
        {/* HEADER */}
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase opacity-60">
              REEF · NEO BANK
            </p>
            <h1 className="font-display text-[28px] font-black tracking-tight mt-0.5">
              أهلاً، {ownerName.split(" ")[0]}
            </h1>
          </div>
          {activeAsset && (
            <motion.span
              layoutId="active-asset-badge"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10.5px] font-extrabold ring-1 ring-white/15"
            >
              {activeAsset.label}
            </motion.span>
          )}
        </motion.section>

        {/* SUPER-CARDS CAROUSEL */}
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
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 backdrop-blur-md px-2 py-3 ring-1 ring-white/10 active:scale-[0.96] transition"
            >
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-white/10 text-white group-active:bg-primary/60 transition">
                <a.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[10.5px] font-bold opacity-85">{a.label}</span>
            </button>
          ))}
        </div>

        {/* MINI-APP DOCK */}
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
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
                dock === t.id ? "bg-white text-[oklch(0.16_0.02_260)]" : "text-white/70"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* DOCK CONTENT (placeholders for next phase) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dock}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-white/[0.04] backdrop-blur-md ring-1 ring-white/10 p-5 min-h-[180px]"
          >
            <p className="text-[12px] font-bold opacity-60 mb-1.5">قادم في Phase 13.35</p>
            <p className="text-[14px] opacity-90">
              {dock === "ops" && "سجل العمليات الموحّد عبر الأصول الخمسة + فلترة ذكية."}
              {dock === "gameyas" && "محرك الجمعيات الإسلامي بالضامن والـ KYC والتوقيع الإلكتروني."}
              {dock === "vaults" && "حصّالاتك الذهبية والنقدية مع الادخار التلقائي عند كل عملية."}
              {dock === "insights" && "مدير مالي شخصي يحلّل إنفاقك ويقترح الميزانيات."}
            </p>
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
      </AnimatePresence>
    </div>
  );
};

export default Wallet;
