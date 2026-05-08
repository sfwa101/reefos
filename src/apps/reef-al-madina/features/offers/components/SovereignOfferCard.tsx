/**
 * SovereignOfferCard — Phase 21.
 * The atomic Spatio-Temporal offer card. Surfaces title, subtitle,
 * Honest Margin (Baraka), and the Smart Fakka round-up toggle.
 */
import { Sparkles } from "lucide-react";
import HonestMarginBadge from "./HonestMarginBadge";
import FakkaRoundupToggle from "./FakkaRoundupToggle";
import type { OfferMatrixRow } from "../types/offerMatrix";

export const SovereignOfferCard = ({ offer }: { offer: OfferMatrixRow }) => {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/30 p-4 shadow-tile">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Sparkles className="h-3 w-3" />
            {offer.block_type}
          </div>
          <h3 className="font-display text-base font-extrabold leading-tight">
            {offer.title}
          </h3>
          {offer.subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{offer.subtitle}</p>
          )}
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        {typeof offer.honest_margin_pct === "number" && (
          <HonestMarginBadge marginPct={offer.honest_margin_pct} />
        )}
        {offer.allow_fakka_roundup && <FakkaRoundupToggle offerId={offer.id} />}
      </div>
    </article>
  );
};

export default SovereignOfferCard;
