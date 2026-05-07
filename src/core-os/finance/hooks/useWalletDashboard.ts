import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CATEGORY_LABELS,
  PIE_COLORS,
  type Budget,
  type CategoryStat,
  type ReferralRow,
  type WalletTab,
} from "@/core-os/finance/types/wallet.types";
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

type ProductsRel = {
  category: string | null;
  old_price: number | null;
  price: number | null;
} | null;

type OrderItemRow = {
  price: number;
  quantity: number;
  product_id: string;
  created_at: string;
  order_id: string;
  products: ProductsRel;
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

      const orderIdRes = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId);
      const orderIds = (orderIdRes.data ?? []).map((o) => o.id);

      const [
        { data: items },
        { data: refRows },
        { data: refCode },
        { data: budgetRows },
      ] = await Promise.all([
        supabase
          .from("order_items")
          .select(
            "price,quantity,product_id,created_at,products(category, old_price, price)",
          )
          .in("order_id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]),
        supabase
          .from("referrals")
          .select("id,status,commission,first_order_at,created_at")
          .eq("referrer_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("referral_codes")
          .select("code")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("category_budgets")
          .select("category,monthly_limit")
          .eq("user_id", userId),
      ]);

      if (!mounted) return;

      setReferrals((refRows ?? []) as ReferralRow[]);
      setReferralCode(refCode?.code ?? null);

      const bMap: Record<string, number> = {};
      ((budgetRows ?? []) as Budget[]).forEach((b) => {
        bMap[b.category] = Number(b.monthly_limit);
      });
      setBudgets(bMap);

      const byCat: Record<string, number> = {};
      const monthCat: Record<string, number> = {};
      let savings = 0;
      for (const it of (items ?? []) as unknown as OrderItemRow[]) {
        const cat = it.products?.category || "other";
        const lineTotal = Number(it.price) * Number(it.quantity);
        byCat[cat] = (byCat[cat] || 0) + lineTotal;
        const ts = it.created_at ? new Date(it.created_at) : null;
        if (ts && ts >= monthStart) monthCat[cat] = (monthCat[cat] || 0) + lineTotal;
        const op = it.products?.old_price;
        const pp = it.products?.price;
        if (op && pp && op > pp) {
          savings += (Number(op) - Number(pp)) * Number(it.quantity);
        }
      }
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
    const { data, error } = await supabase.rpc("ensure_referral_code", {
      _user_id: userId,
    });
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
