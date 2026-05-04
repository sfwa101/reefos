import { useEffect, useMemo, useState } from "react";
import { products, useProductsVersion } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import DynamicHeroBanner from "@/features/offers/components/DynamicHeroBanner";
import PersonalizedDealsRail from "@/features/offers/components/PersonalizedDealsRail";
import FlashSalesGrid from "@/features/offers/components/FlashSalesGrid";
import BundleDealsRail, { type BundleDeal } from "@/features/offers/components/BundleDealsRail";
import TierExclusiveOffers, { type TierOffer } from "@/features/offers/components/TierExclusiveOffers";

const tabs = [
  { id: "all", label: "الكل" },
  { id: "best", label: "الأكثر مبيعًا" },
  { id: "trending", label: "رائج" },
  { id: "discount", label: "تخفيضات" },
] as const;

type TabId = typeof tabs[number]["id"];

const useDailyCountdown = () => {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      const h = Math.floor(diff / 36e5);
      const m = Math.floor((diff % 36e5) / 6e4);
      const s = Math.floor((diff % 6e4) / 1e3);
      setLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return left;
};

const Offers = () => {
  const _pv = useProductsVersion();
  const [tab, setTab] = useState<TabId>("all");
  const countdown = useDailyCountdown();

  const discounted = useMemo(() => products.filter((p) => p.oldPrice), [_pv]);
  const flashSale = useMemo(() => discounted.slice(0, 4), [discounted]);
  const personalized = useMemo(() => discounted.slice(4, 10), [discounted]);

  const bundles: BundleDeal[] = useMemo(
    () => [
      { id: "b1", title: "باقة الإفطار العائلي", subtitle: "وفر 18٪", priceLabel: "ابدأ من 149 ج" },
      { id: "b2", title: "باقة المخبوزات", subtitle: "وفر 22٪", priceLabel: "ابدأ من 89 ج" },
    ],
    [],
  );

  const tierOffers: TierOffer[] = useMemo(
    () => [
      { id: "t1", title: "خصم 15٪ على اللحوم", tier: "silver", description: "كل أسبوع" },
      { id: "t2", title: "توصيل VIP مجاني", tier: "gold" },
      { id: "t3", title: "كاشباك مضاعف", tier: "platinum" },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const onSale = new Set(discounted.map((p) => p.id));
    const featured = products.filter(
      (p) => onSale.has(p.id) || p.badge === "best" || p.badge === "trending",
    );
    if (tab === "all") return featured;
    if (tab === "discount") return discounted;
    return featured.filter((p) => p.badge === tab);
  }, [tab, discounted, _pv]);

  return (
    <div className="space-y-6 px-4 lg:px-8" dir="rtl">
      <section className="animate-float-up">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">العروض</h1>
        <p className="mt-1 text-xs text-muted-foreground">خصومات اليوم من جميع الأقسام</p>
      </section>

      <DynamicHeroBanner countdown={countdown} />

      <PersonalizedDealsRail items={personalized} />

      <FlashSalesGrid items={flashSale} />

      <BundleDealsRail bundles={bundles} />

      <TierExclusiveOffers offers={tierOffers} userTier="bronze" />

      <section className="space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  active ? "bg-primary text-primary-foreground shadow-pill" : "bg-foreground/5"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا توجد عروض في هذا القسم حالياً
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Offers;
