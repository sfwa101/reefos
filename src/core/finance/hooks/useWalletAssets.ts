import { useEffect, useState } from "react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";

export type AssetType = "egp" | "points" | "cashback" | "gold" | "coupons";

export type WalletAsset = {
  type: AssetType;
  label: string;
  unit: string;
  balance: number;
  /** OKLCH gradient pair from→to (use as inline style) */
  gradient: string;
  subtitle: string;
};

const ASSET_META: Record<AssetType, Omit<WalletAsset, "balance" | "type">> = {
  egp: {
    label: "الجنيه المصري",
    unit: "ج.م",
    gradient: "linear-gradient(135deg, oklch(0.45 0.15 165), oklch(0.62 0.18 155))",
    subtitle: "الرصيد الأساسي للإنفاق",
  },
  points: {
    label: "نقاط الولاء",
    unit: "نقطة",
    gradient: "linear-gradient(135deg, oklch(0.55 0.18 280), oklch(0.70 0.20 295))",
    subtitle: "اربح مع كل عملية شراء",
  },
  cashback: {
    label: "الكاش باك",
    unit: "ج.م",
    gradient: "linear-gradient(135deg, oklch(0.50 0.18 25), oklch(0.68 0.20 35))",
    subtitle: "استرداد فوري قابل للسحب",
  },
  gold: {
    label: "الذهب الرقمي",
    unit: "جرام",
    gradient: "linear-gradient(135deg, oklch(0.65 0.13 80), oklch(0.82 0.15 90))",
    subtitle: "ادخار شرعي بسعر اللحظة",
  },
  coupons: {
    label: "الكوبونات",
    unit: "كوبون",
    gradient: "linear-gradient(135deg, oklch(0.45 0.10 220), oklch(0.62 0.14 230))",
    subtitle: "خصومات حصرية على الكتالوج",
  },
};

/**
 * useWalletAssets — unifies multi-asset balances for the new Neo-Bank carousel.
 * Reads from the legacy wallet_balances row plus the new wallet_assets table,
 * gracefully falling back to zero so the UI is never blank.
 */
export function useWalletAssets(userId: string | null) {
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const [legacy, multi] = await Promise.all([
        FinanceGateway.getWalletBalanceLegacy(userId),
        FinanceGateway.listMultiAssetBalances(userId),
      ]);

      const legacyData = legacy as {
        balance?: number | null;
        points?: number | null;
        cashback?: number | null;
        coupons?: number | null;
      } | null;

      const map: Record<AssetType, number> = {
        egp: Number(legacyData?.balance ?? 0),
        points: Number(legacyData?.points ?? 0),
        cashback: Number(legacyData?.cashback ?? 0),
        gold: 0,
        coupons: Number(legacyData?.coupons ?? 0),
      };

      for (const row of multi as Array<{ asset_type: string; balance: number }>) {
        const t = row.asset_type as AssetType;
        if (t in map) map[t] = Number(row.balance ?? 0);
      }

      if (!mounted) return;
      setAssets(
        (Object.keys(ASSET_META) as AssetType[]).map((type) => ({
          type,
          balance: map[type],
          ...ASSET_META[type],
        })),
      );
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  return { assets, loading };
}
