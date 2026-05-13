/**
 * SduiOfferBundle — Phase 21 Stem Cell wrapping BundleDealsRail.
 */
import { useMemo } from "react";
import BundleDealsRail, { type BundleDeal } from "@/apps/reef-al-madina/features/offers/components/BundleDealsRail";
import HonestMarginBadge from "@/apps/reef-al-madina/features/offers/components/HonestMarginBadge";
import FakkaRoundupToggle from "@/apps/reef-al-madina/features/offers/components/FakkaRoundupToggle";
import EitharToggle from "@/apps/reef-al-madina/features/offers/components/EitharToggle";
import { AmanahLockShield } from "./AmanahLockShield";
import type { SduiOfferBundleBlock } from "./schemas";

export const SduiOfferBundle = ({ block }: { block: SduiOfferBundleBlock }) => {
  const { title, honest_margin, amanah_lock, allow_fakka_roundup } = block.props;
  const bundles = useMemo<BundleDeal[]>(
    () => [
      { id: "b1", title: "باقة الإفطار العائلي", subtitle: "وفر 18٪", priceLabel: "ابدأ من 149 ج" },
      { id: "b2", title: "باقة المخبوزات", subtitle: "وفر 22٪", priceLabel: "ابدأ من 89 ج" },
    ],
    [],
  );

  if (amanah_lock) return <AmanahLockShield tier={amanah_lock} title={title} />;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {honest_margin !== undefined && <HonestMarginBadge marginPct={honest_margin} />}
        {allow_fakka_roundup && <FakkaRoundupToggle offerId={block.id} />}
        <EitharToggle offerId={block.id} />
      </div>
      <BundleDealsRail bundles={bundles} title={title} />
    </section>
  );
};
