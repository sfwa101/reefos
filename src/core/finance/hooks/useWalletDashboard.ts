import { useEffect, useState } from "react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { toast } from "sonner";
import {
  CATEGORY_LABELS,
  PIE_COLORS,
  type Budget,
  type CategoryStat,
  type ReferralRow,
  type WalletTab,
} from "@/core/finance/types/wallet.types";
import { useWalletBalance } from "./useWalletBalance";
import { useWalletTransactions } from "./useWalletTransactions";
import { useWalletSavings } from "./useWalletSavings";

/**
 * useWalletDashboard — facade controller for the Wallet page.
 *
 * After the Phase-A refactor, the heavy lifting lives in three focused
 * slices (`useWalletBalance`, `useWalletTransactions`, `useWalletSavings`).
 * This facade keeps the original public shape so existing pages that
 * consume `c.balance`, `c.txs`, `c.jar`, etc. continue to work
 * unchanged — but each slice can now re-render in isolation.
 */

// Sovereign asset shape returned via fulfillment_items → sku → asset.
type AssetRel = {
  category_path: string | null;
  traits: { old_price?: number | null; price?: number | null } | null;
} | null;

type FulfillmentItemRow = {
  price_at_time: number;
  quantity: number;
  created_at: string;
  node_id: string;
  salsabil_skus: { salsabil_assets: AssetRel } | null;
};

export type AppSpend = { app_id: string; total: number };

export const useWalletDashboard = () => {
  // ===== Tab + dialog UI state =====
  const [tab, setTab] = useState<WalletTab>("balance");
  const [showTopup, setShowTopup] = useState(false);
  const [showPos, setShowPos] = useState(false);
  const [showJar, setShowJar] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // ===== Decomposed slices =====
  const balanceSlice = useWalletBalance();
  const { userId, balance, setBalance, profile, trustLimit, tier } = balanceSlice;
  const { txs } = useWalletTransactions(userId);
  const { jar, setJar, jarTxs, setJarTxs } = useWalletSavings(userId);

  // ===== Analytics / referrals / budgets (page-only) =====
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [monthByCat, setMonthByCat] = useState<Record<string, number>>({});
  const [totalSavings, setTotalSavings] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [appSpend, setAppSpend] = useState<AppSpend[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setExtrasLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Sovereign Matrix: walk master_orders → fulfillment_nodes → fulfillment_items.
      // App grouping is captured at master_orders.delivery_info.app_id (Phase VII-A invariant).
      const masterData = await FinanceGateway.listMasterOrdersWithFulfillmentNodes(userId);
      type MasterRow = {
        delivery_info?: { app_id?: string } | null;
        salsabil_fulfillment_nodes?: Array<{ id: string }> | null;
      };
      const masters = masterData as unknown as MasterRow[];
      const nodeIds: string[] = [];
      const nodeApp: Record<string, string> = {};
      masters.forEach((m) => {
        const appKey = m.delivery_info?.app_id ?? "reef";
        (m.salsabil_fulfillment_nodes ?? []).forEach((n) => {
          nodeIds.push(n.id);
          nodeApp[n.id] = appKey;
        });
      });

      const [items, refRows, refCode, budgetRows] = await Promise.all([
        FinanceGateway.listFulfillmentItemsWithAssets(nodeIds),
        FinanceGateway.listUserReferrals(userId),
        FinanceGateway.getUserReferralCode(userId),
        FinanceGateway.listCategoryBudgets(userId),
      ]);

      if (!mounted) return;

      setReferrals((refRows ?? []) as ReferralRow[]);
      setReferralCode((refCode as { code?: string } | null)?.code ?? null);

      const bMap: Record<string, number> = {};
      ((budgetRows ?? []) as Budget[]).forEach((b) => {
        bMap[b.category] = Number(b.monthly_limit);
      });
      setBudgets(bMap);

      const byCat: Record<string, number> = {};
      const monthCat: Record<string, number> = {};
      const byApp: Record<string, number> = {};
      let savings = 0;
      for (const it of (items ?? []) as unknown as FulfillmentItemRow[]) {
        const asset = it.salsabil_skus?.salsabil_assets ?? null;
        const cat = asset?.category_path?.split("/")?.[0] || "other";
        const lineTotal = Number(it.price_at_time) * Number(it.quantity);
        byCat[cat] = (byCat[cat] || 0) + lineTotal;
        const appKey = nodeApp[it.node_id] ?? "reef";
        byApp[appKey] = (byApp[appKey] || 0) + lineTotal;
        const ts = it.created_at ? new Date(it.created_at) : null;
        if (ts && ts >= monthStart) monthCat[cat] = (monthCat[cat] || 0) + lineTotal;
        const op = asset?.traits?.old_price;
        const pp = asset?.traits?.price;
        if (op && pp && Number(op) > Number(pp)) {
          savings += (Number(op) - Number(pp)) * Number(it.quantity);
        }
      }
      setAppSpend(
        Object.entries(byApp)
          .map(([app_id, total]) => ({ app_id, total: Math.round(total) }))
          .sort((a, b) => b.total - a.total),
      );
      const stats = Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v], i) => ({
          key: k,
          name: CATEGORY_LABELS[k] || k,
          value: Math.round(v),
          color: PIE_COLORS[i % PIE_COLORS.length],
        }));
      setCategoryStats(stats);
      setMonthByCat(monthCat);
      setTotalSavings(Math.round(savings));
      setExtrasLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const ensureReferralCode = async (): Promise<string | null> => {
    if (!userId) return null;
    if (referralCode) return referralCode;
    const { data, error } = await FinanceGateway.ensureReferralCode(userId);
    if (error) {
      toast.error("تعذّر إنشاء كود الدعوة");
      return null;
    }
    setReferralCode(data as string);
    return data as string;
  };

  const openTopup = () => {
    if (!userId) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    setShowTopup(true);
  };

  const openAffiliateTab = async () => {
    setTab("affiliate");
    if (!referralCode) await ensureReferralCode();
  };

  // Derived values
  const successfulRefs = referrals.filter((r) => r.status === "purchased").length;
  const totalCommission = referrals.reduce(
    (s, r) => s + Number(r.commission || 0),
    0,
  );
  const customerCode = (userId ?? "00000000")
    .slice(0, 12)
    .toUpperCase()
    .replace(/-/g, "");

  const loading = balanceSlice.loading || extrasLoading;

  return {
    // state
    tab,
    setTab,
    balance,
    setBalance,
    profile,
    txs,
    loading,
    userId,
    showTopup,
    setShowTopup,
    showPos,
    setShowPos,
    categoryStats,
    monthByCat,
    totalSavings,
    appSpend,
    referralCode,
    referrals,
    jar,
    setJar,
    jarTxs,
    setJarTxs,
    showJar,
    setShowJar,
    tier,
    showTransfer,
    setShowTransfer,
    trustLimit,
    budgets,
    setBudgets,
    // derived
    successfulRefs,
    totalCommission,
    customerCode,
    // actions
    ensureReferralCode,
    openTopup,
    openAffiliateTab,
  };
};

export type WalletDashboardController = ReturnType<typeof useWalletDashboard>;
