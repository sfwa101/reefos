import { useMemo } from "react";
import { products, useProductsVersion } from "@/lib/products";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicHeroBanner from "@/features/offers/components/DynamicHeroBanner";
import PersonalizedDealsRail from "@/features/offers/components/PersonalizedDealsRail";
import FlashSalesGrid from "@/features/offers/components/FlashSalesGrid";
import BundleDealsRail, { type BundleDeal } from "@/features/offers/components/BundleDealsRail";
import SectionOffersRail from "@/features/offers/components/SectionOffersRail";
import SponsoredRestaurantRail from "@/features/offers/components/SponsoredRestaurantRail";
import TierExclusiveOffers, { type TierOffer } from "@/features/offers/components/TierExclusiveOffers";
import { useOffersRails } from "@/features/offers/hooks/useOffersRails";
import { useDailyCountdown } from "@/features/offers/hooks/useDailyCountdown";
import type { StorefrontRail } from "@/features/offers/types/rail";

const Offers = () => {
  const _pv = useProductsVersion();
  const countdown = useDailyCountdown();
  const { rails, loading } = useOffersRails();

  const discounted = useMemo(() => products.filter((p) => p.oldPrice), [_pv]);
  const flashSale = useMemo(() => discounted.slice(0, 4), [discounted]);
  const personalized = useMemo(() => discounted.slice(4, 10), [discounted]);

  const fallbackBundles: BundleDeal[] = useMemo(
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

  const renderRail = (rail: StorefrontRail) => {
    switch (rail.type) {
      case "flash_sale":
        return <FlashSalesGrid key={rail.id} items={flashSale} title={rail.title} />;
      case "bundle":
        return <BundleDealsRail key={rail.id} bundles={fallbackBundles} title={rail.title} />;
      case "personalized":
        return <PersonalizedDealsRail key={rail.id} items={personalized} title={rail.title} />;
      case "restaurant":
      case "sponsored":
        return (
          <SponsoredRestaurantRail
            key={rail.id}
            title={rail.title}
            subtitle={rail.subtitle}
            restaurantId={rail.target_id}
          />
        );
      case "category":
        return (
          <SectionOffersRail
            key={rail.id}
            title={rail.title}
            subtitle={rail.subtitle}
            targetId={rail.target_id}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 px-4 lg:px-8" dir="rtl">
      <section className="animate-float-up">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">العروض</h1>
        <p className="mt-1 text-xs text-muted-foreground">خصومات اليوم من جميع الأقسام</p>
      </section>

      <DynamicHeroBanner countdown={countdown} />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : rails.length === 0 ? (
        <div className="space-y-6">
          <PersonalizedDealsRail items={personalized} />
          <FlashSalesGrid items={flashSale} />
          <BundleDealsRail bundles={fallbackBundles} />
          <TierExclusiveOffers offers={tierOffers} userTier="bronze" />
          <p className="py-4 text-center text-xs text-muted-foreground">
            نجهز لكم أقوى العروض قريباً…
          </p>
        </div>
      ) : (
        <div className="space-y-6">{rails.map(renderRail)}</div>
      )}
    </div>
  );
};

export default Offers;
