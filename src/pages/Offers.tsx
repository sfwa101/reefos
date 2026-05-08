import { useMemo } from "react";
import { products } from "@/lib/products";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, MapPin, Clock } from "lucide-react";
import DynamicHeroBanner from "@/apps/reef-al-madina/features/offers/components/DynamicHeroBanner";
import PersonalizedDealsRail from "@/apps/reef-al-madina/features/offers/components/PersonalizedDealsRail";
import FlashSalesGrid from "@/apps/reef-al-madina/features/offers/components/FlashSalesGrid";
import BundleDealsRail, { type BundleDeal } from "@/apps/reef-al-madina/features/offers/components/BundleDealsRail";
import SectionOffersRail from "@/apps/reef-al-madina/features/offers/components/SectionOffersRail";
import SponsoredRestaurantRail from "@/apps/reef-al-madina/features/offers/components/SponsoredRestaurantRail";
import TierExclusiveOffers, { type TierOffer } from "@/apps/reef-al-madina/features/offers/components/TierExclusiveOffers";
import SovereignOfferCard from "@/apps/reef-al-madina/features/offers/components/SovereignOfferCard";
import { useDailyCountdown } from "@/apps/reef-al-madina/features/offers/hooks/useDailyCountdown";
import { useSpatioTemporalOffers } from "@/apps/reef-al-madina/features/offers/hooks/useSpatioTemporalOffers";
import type { OfferMatrixRow } from "@/apps/reef-al-madina/features/offers/types/offerMatrix";

/**
 * Phase 21 — The Spatio-Temporal Offers Surface.
 * Reads from `offers_matrix` via `useSpatioTemporalOffers`, which morphs the
 * page based on Time × Space × Identity × Amanah. The legacy hardcoded rails
 * remain as a graceful fallback when the matrix is empty.
 */
const Offers = () => {
  const countdown = useDailyCountdown();
  const { offers, loading, userContext } = useSpatioTemporalOffers();

  const discounted = useMemo(() => products.filter((p) => p.oldPrice), []);
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

  const renderMatrixOffer = (row: OfferMatrixRow) => {
    switch (row.block_type) {
      case "flash_sale":
        return <FlashSalesGrid key={row.id} items={flashSale} title={row.title} />;
      case "bundle":
        return <BundleDealsRail key={row.id} bundles={fallbackBundles} title={row.title} />;
      case "personalized":
        return <PersonalizedDealsRail key={row.id} items={personalized} title={row.title} />;
      case "restaurant":
      case "sponsored":
        return (
          <SponsoredRestaurantRail
            key={row.id}
            title={row.title}
            subtitle={row.subtitle}
            restaurantId={row.target_id}
          />
        );
      case "category":
        return (
          <SectionOffersRail
            key={row.id}
            title={row.title}
            subtitle={row.subtitle}
            targetId={row.target_id}
          />
        );
      case "tier_exclusive":
      default:
        return <SovereignOfferCard key={row.id} offer={row} />;
    }
  };

  return (
    <div className="space-y-6 lg:px-8" dir="rtl">
      <section className="animate-float-up">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">العروض</h1>
        <p className="mt-1 text-xs text-muted-foreground">خصومات اليوم من جميع الأقسام</p>

        {/* Spatio-Temporal context strip — proves the engine is live */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {userContext.governorate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5">
              <MapPin className="h-3 w-3" />
              {userContext.governorate}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5">
            <Clock className="h-3 w-3" />
            {countdown}
          </span>
          {userContext.isKycVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              مواطن موثّق
            </span>
          )}
        </div>
      </section>

      <DynamicHeroBanner countdown={countdown} />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : offers.length === 0 ? (
        <div className="space-y-6">
          <PersonalizedDealsRail items={personalized} />
          <FlashSalesGrid items={flashSale} />
          <BundleDealsRail bundles={fallbackBundles} />
          <TierExclusiveOffers offers={tierOffers} userTier={userContext.tier} />
          <p className="py-4 text-center text-xs text-muted-foreground">
            نجهز لكم أقوى العروض قريباً…
          </p>
        </div>
      ) : (
        <div className="space-y-6">{offers.map(renderMatrixOffer)}</div>
      )}
    </div>
  );
};

export default Offers;
