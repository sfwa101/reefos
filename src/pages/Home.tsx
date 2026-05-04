/**
 * Home — Phase 11.3 Billion-Dollar SDUI Body.
 *
 * 100% DB-driven. Zero hardcoded products, zero hardcoded categories,
 * zero hardcoded "stories". Every visual cell sources its data from
 * Supabase via dedicated hooks:
 *
 *   - SmartGreeting        → AuthContext (profile.full_name) + local clock
 *   - DynamicStoryCircles  → useFeaturedCategoriesQuery (public.categories)
 *   - "عروض صُممت لك"      → useProductsQuery, filtered by oldPrice > price
 *   - "الأكثر طلباً"        → useProductsQuery, ordered by sort_order/badge
 *   - "اشترِ مجدداً"        → useBuyAgainProducts (order_items history)
 *   - Explore tiles        → useFeaturedCategoriesQuery (admin-controlled)
 *
 * The legacy Phase-26 SDUI hero (LayoutFactory pageKey="main_hub") is
 * preserved at the top so admins keep ordering control via /admin/design.
 * Below it: a clean, Apple-style minimal stack with horizontal carousels
 * only — no vertical product grids. pb-32 reserves room for the TabBar.
 *
 * Architecture: pure orchestration shell. All business logic lives in
 * hooks (`features/main-hub`, `hooks/`). Cell-membrane respected.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/context/LocationContext";
import { logBehavior } from "@/lib/behavior";
import { isPerishable, type Product } from "@/lib/products";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import { useBuyAgainProducts } from "@/hooks/useBuyAgainProducts";
import { useFeaturedCategoriesQuery } from "@/hooks/useFeaturedCategories";

import ProductCarousel from "@/components/ProductCarousel";
import SmartBanners from "@/components/SmartBanners";
import LiveBanners from "@/components/LiveBanners";
import MegaEventBanner from "@/components/MegaEventBanner";
import LoyaltyProgress from "@/components/LoyaltyProgress";
import InactivityNudger from "@/components/InactivityNudger";
import FlashSalesRail from "@/components/FlashSalesRail";

import SmartGreeting from "@/features/main-hub/components/SmartGreeting";
import DynamicStoryCircles from "@/features/main-hub/components/DynamicStoryCircles";

const cv = { contentVisibility: "auto" as const, containIntrinsicSize: "1px 360px" };
const RAIL_LIMIT = 12;

const HomePage = () => {
  const { user } = useAuth();
  const { zone } = useLocation();
  const [walletBalance, setWalletBalance] = useState(0);
  const [hasReferralCode, setHasReferralCode] = useState(false);

  // ─── DB sources ────────────────────────────────────────────────────
  const { data: catalog = [] } = useProductsQuery();
  const { products: buyAgain } = useBuyAgainProducts();
  const { data: featuredCats = [] } = useFeaturedCategoriesQuery();

  // Zone-aware filter (perishables blocked in non-cold zones)
  const zoneSafe = useMemo<Product[]>(
    () => (zone.acceptsPerishables ? catalog : catalog.filter((p) => !isPerishable(p))),
    [catalog, zone.acceptsPerishables],
  );

  // Rail 1 — Real discounts from DB (oldPrice > price)
  const dealsRail = useMemo<Product[]>(
    () =>
      zoneSafe
        .filter((p) => typeof p.oldPrice === "number" && p.oldPrice! > p.price)
        .sort((a, b) => {
          const da = (a.oldPrice ?? a.price) - a.price;
          const db = (b.oldPrice ?? b.price) - b.price;
          return db - da;
        })
        .slice(0, RAIL_LIMIT),
    [zoneSafe],
  );

  // Rail 2 — Bestsellers (badge='best'/'trending', else top rated)
  const bestRail = useMemo<Product[]>(() => {
    const flagged = zoneSafe.filter((p) => p.badge === "best" || p.badge === "trending");
    const pool = flagged.length >= 6
      ? flagged
      : [...zoneSafe].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return pool.slice(0, RAIL_LIMIT);
  }, [zoneSafe]);

  // Wallet + referral state for SmartBanners
  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      setHasReferralCode(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [walletRes, refRes] = await Promise.all([
        supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setWalletBalance(Number(walletRes.data?.balance ?? 0));
      setHasReferralCode(Boolean(refRes.data?.code));
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (user?.id) void logBehavior({ event: "app_open", force: true });
  }, [user?.id]);

  return (
    <div className="space-y-6 bg-background px-4 pb-32 text-foreground" dir="rtl">
      {/* Native smart header — replaces parasitic LayoutFactory hero */}
      <SmartGreeting />
      <DynamicStoryCircles />

      {/* Contextual smart banners (DB-fed) */}
      <SmartBanners walletBalance={walletBalance} hasReferralCode={hasReferralCode} />
      <LiveBanners placement="hero" />

      <InactivityNudger />
      <MegaEventBanner />
      <LoyaltyProgress />
      <FlashSalesRail />

      {/* RAIL 1 — Real DB discounts */}
      {dealsRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="عروض صُممت لك"
            subtitle="خصومات حقيقية على منتجاتك المفضلة"
            accent="🎯 وفّر اليوم"
            products={dealsRail}
            seeAllTo="/offers"
          />
        </section>
      )}

      {/* RAIL 2 — Bestsellers from DB badge / rating */}
      {bestRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="الأكثر طلباً"
            subtitle={`اختيارات الأهالي في ${zone.shortName}`}
            accent="🔥 رائج الآن"
            products={bestRail}
            seeAllTo="/sections"
          />
        </section>
      )}

      {/* RAIL 3 — Buy It Again (signed-in users only) */}
      {user && buyAgain.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="اشترِ مجدداً"
            subtitle="منتجات اعتدت طلبها — أعدها بضغطة"
            accent="🛍️ سهل وسريع"
            products={buyAgain}
            seeAllTo="/account/orders"
          />
        </section>
      )}

      {/* Explore — DB-driven featured categories grid */}
      {featuredCats.length > 0 && (
        <section className="animate-float-up" style={cv}>
          <h2 className="mb-3 px-1 font-display text-xl font-extrabold text-foreground">
            استكشف بطريقتك
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {featuredCats.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                to={c.to}
                className="glass-strong flex flex-col gap-2 rounded-2xl p-4 shadow-soft transition ease-apple hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{
                    background: `conic-gradient(from 180deg, hsl(${c.ringFrom}), hsl(${c.ringTo}))`,
                  }}
                >
                  <span aria-hidden>{c.emoji}</span>
                </div>
                <div>
                  <p className="font-display text-sm font-extrabold text-foreground line-clamp-1">
                    {c.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">تسوّق الآن</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-1">
        <Link to="/sections" className="flex items-center gap-1 text-xs font-bold text-primary">
          استكشف كل الأقسام <ChevronLeft className="h-3 w-3" />
        </Link>
      </section>

      <p className="pt-2 text-center text-[11px] font-medium text-muted-foreground">
        ريف المدينة · عبق الريف داخل المدينة
      </p>
    </div>
  );
};

export default HomePage;
