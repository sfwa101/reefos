import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, MapPin, Clock, Moon } from "lucide-react";
import DynamicHeroBanner from "@/apps/reef-al-madina/features/offers/components/DynamicHeroBanner";
import { SduiRenderer } from "@/core-os/sdui-engine/components/SduiRenderer";
import { parseBlocks, type SduiBlock } from "@/core-os/sdui-engine/engine/schemas";
import { useDailyCountdown } from "@/apps/reef-al-madina/features/offers/hooks/useDailyCountdown";
import { useSpatioTemporalOffers } from "@/apps/reef-al-madina/features/offers/hooks/useSpatioTemporalOffers";
import { useSovereignPrayerStore } from "@/core-os/spirit/useSovereignPrayer";
import type { OfferMatrixRow } from "@/apps/reef-al-madina/features/offers/types/offerMatrix";

/**
 * Phase 21 — The Spatio-Temporal Offers Surface.
 * Reads from `offers_matrix` via `useSpatioTemporalOffers`, maps each row to
 * a Level-4 SDUI block, and pumps them through the central `SduiRenderer`.
 * The Spirit Engine pauses tickers automatically during the prayer window.
 */
const Offers = () => {
  const countdown = useDailyCountdown();
  const { offers, loading, userContext } = useSpatioTemporalOffers();
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);

  // Translate matrix rows into SDUI blocks. Unknown block_types fall through
  // to the generic flash sale renderer so admins never produce a dead row.
  const blocks: SduiBlock[] = useMemo(() => {
    const raw = offers.map((row: OfferMatrixRow) => {
      const sovereign = {
        honest_margin: row.honest_margin_pct ?? undefined,
        amanah_lock: row.persona_context?.required_tier ?? undefined,
        allow_fakka_roundup: row.allow_fakka_roundup,
      };
      switch (row.block_type) {
        case "bundle":
          return {
            type: "offer_bundle" as const,
            id: row.id,
            props: { title: row.title, subtitle: row.subtitle ?? undefined, target_id: row.target_id, ...sovereign },
          };
        case "personalized":
        case "category":
        case "restaurant":
        case "sponsored":
        case "tier_exclusive":
        case "flash_sale":
        default:
          if (row.block_type === ("group_buy" as unknown as string) && row.target_id) {
            return {
              type: "offer_group_buy" as const,
              id: row.id,
              props: { title: row.title, subtitle: row.subtitle ?? undefined, campaign_id: row.target_id, ...sovereign },
            };
          }
          return {
            type: "offer_flash_sale" as const,
            id: row.id,
            props: { title: row.title, subtitle: row.subtitle ?? undefined, target_id: row.target_id, ...sovereign },
          };
      }
    });
    return parseBlocks(raw);
  }, [offers]);

  return (
    <div className="space-y-6 lg:px-8" dir="rtl">
      <section className="animate-float-up">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">العروض</h1>
        <p className="mt-1 text-xs text-muted-foreground">خصومات اليوم من جميع الأقسام</p>

        {/* Spatio-Temporal context strip — proves the engine is breathing */}
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
          {isDormant && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
              <Moon className="h-3 w-3" />
              وقت صلاة — إيقاف العروض
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
      ) : (
        <SduiRenderer
          blocks={blocks}
          empty={
            <p className="py-10 text-center text-xs text-muted-foreground">
              نجهز لكم أقوى العروض قريباً…
            </p>
          }
        />
      )}
    </div>
  );
};

export default Offers;
