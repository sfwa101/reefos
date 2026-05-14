/**
 * SduiOfferFlashSaleBlock — Phase 21 Stem Cell wrapping the legacy
 * FlashSalesGrid. Pauses gracefully during Sovereign Dormancy.
 */
import { useMemo } from "react";
import FlashSalesGrid from "@/apps/reef-al-madina/features/offers/components/FlashSalesGrid";
import HonestMarginBadge from "@/apps/reef-al-madina/features/offers/components/HonestMarginBadge";
import FakkaRoundupToggle from "@/apps/reef-al-madina/features/offers/components/FakkaRoundupToggle";
import EitharToggle from "@/apps/reef-al-madina/features/offers/components/EitharToggle";
import { products } from "@/core/catalog/runtime/legacyRuntime";
import { useSovereignPrayerStore } from "@/core/spirit/useSovereignPrayer";
import { AmanahLockShield } from "./AmanahLockShield";
import type { SduiOfferFlashSaleBlock } from "./schemas";

export const SduiOfferFlashSale = ({ block }: { block: SduiOfferFlashSaleBlock }) => {
  const { title, subtitle, honest_margin, amanah_lock, allow_fakka_roundup } = block.props;
  const isDormant = useSovereignPrayerStore((s) => s.isDormant);
  const items = useMemo(() => products.filter((p) => p.oldPrice).slice(0, 4), []);

  if (amanah_lock) return <AmanahLockShield tier={amanah_lock} title={title} />;

  return (
    <section className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {honest_margin !== undefined && <HonestMarginBadge marginPct={honest_margin} />}
        {allow_fakka_roundup && <FakkaRoundupToggle offerId={block.id} />}
        <EitharToggle offerId={block.id} />
      </div>
      <FlashSalesGrid items={items} title={title} subtitle={subtitle ?? undefined} paused={isDormant} />
    </section>
  );
};
