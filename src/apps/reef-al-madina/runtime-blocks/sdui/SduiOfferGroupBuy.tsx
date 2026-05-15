/**
 * SduiOfferGroupBuy — Phase 21 Stem Cell that finally wires the dormant
 * Group-Buy engine into the consumer Offers surface.
 */
import { GroupBuyTicker } from "@/apps/reef-al-madina/features/group-buy/components/GroupBuyTicker";
import { useGroupBuyEngine } from "@/apps/reef-al-madina/features/group-buy/hooks/useGroupBuyEngine";
import HonestMarginBadge from "@/apps/reef-al-madina/features/offers/components/HonestMarginBadge";
import FakkaRoundupToggle from "@/apps/reef-al-madina/features/offers/components/FakkaRoundupToggle";
import EitharToggle from "@/apps/reef-al-madina/features/offers/components/EitharToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { AmanahLockShield } from "@/core/runtime-ui/sdui/blocks/offers/AmanahLockShield";
import type { SduiOfferGroupBuyBlock } from "@/core/runtime-ui/sdui/blocks/offers/schemas";

export const SduiOfferGroupBuy = ({ block }: { block: SduiOfferGroupBuyBlock }) => {
  const { title, subtitle, campaign_id, honest_margin, amanah_lock, allow_fakka_roundup } =
    block.props;
  const { campaign, tierState, loading } = useGroupBuyEngine(campaign_id);

  if (amanah_lock) return <AmanahLockShield tier={amanah_lock} title={title} />;
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!campaign) return null;

  return (
    <section dir="rtl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-extrabold">{title ?? "اشتروا معاً"}</h3>
        </div>
        <div className="flex items-center gap-2">
          {honest_margin !== undefined && <HonestMarginBadge marginPct={honest_margin} />}
          {allow_fakka_roundup && <FakkaRoundupToggle offerId={block.id} />}
          <EitharToggle offerId={block.id} />
        </div>
      </div>
      {subtitle && <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>}
      <GroupBuyTicker campaign={campaign} tierState={tierState} />
    </section>
  );
};
