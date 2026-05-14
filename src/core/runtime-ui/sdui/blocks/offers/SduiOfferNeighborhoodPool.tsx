/**
 * SduiOfferNeighborhoodPool — الجوار الجغرافي.
 *
 * Live "neighborhood pulse" card: counts master orders placed in the
 * user's city in the last 60 minutes (excluding self) and offers a
 * one-tap join into a group-buy. Pure read-side; gracefully hides if
 * the user has no default address. Tagged with sovereign vectors
 * (Honest Margin transparency + Eithar altruism toggle).
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Users, Sparkles } from "lucide-react";
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
import { useAuth } from "@/context/AuthContext";
import HonestMarginBadge from "@/apps/reef-al-madina/features/offers/components/HonestMarginBadge";
import EitharToggle from "@/apps/reef-al-madina/features/offers/components/EitharToggle";
import { AmanahLockShield } from "./AmanahLockShield";
import type { SduiOfferNeighborhoodPoolBlock } from "./schemas";

type NeighborState = { city: string | null; count: number };

async function fetchNeighborPulse(userId: string | null): Promise<NeighborState> {
  if (!userId) return { city: null, count: 0 };
  const city = await RuntimeUIGateway.getDefaultAddressCity(userId);
  if (!city) return { city: null, count: 0 };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const count = await RuntimeUIGateway.countNeighborMasterOrders({
    excludeUserId: userId,
    sinceIso: since,
    city,
  });

  return { city, count };
}

export const SduiOfferNeighborhoodPool = ({
  block,
}: {
  block: SduiOfferNeighborhoodPoolBlock;
}) => {
  const { title, subtitle, campaign_id, honest_margin, amanah_lock, allow_eithar } = block.props;
  const { user } = useAuth();
  const [state, setState] = useState<NeighborState>({ city: null, count: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNeighborPulse(user?.id ?? null)
      .then((r) => !cancelled && setState(r))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (amanah_lock) return <AmanahLockShield tier={amanah_lock} title={title} />;
  if (!loaded || !state.city) return null;

  const count = Math.max(state.count, 0);
  const headline =
    count > 0
      ? `يوجد ${count} من جيرانك في ${state.city} يطلبون الآن!`
      : `كن أول من يفتح طلب جوار في ${state.city} اليوم.`;

  return (
    <section dir="rtl" className="relative">
      <div className="overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
            </span>
            <h3 className="font-display text-base font-extrabold text-foreground">
              {title ?? "نبض الجوار"}
            </h3>
          </div>
          {honest_margin !== undefined && <HonestMarginBadge marginPct={honest_margin} />}
        </div>

        <p className="mt-2 text-sm font-bold text-foreground">{headline}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
            <MapPin className="h-3 w-3 text-emerald-600" /> {state.city}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
            <Users className="h-3 w-3 text-emerald-600" /> {count} طلب نشط
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
            <Sparkles className="h-3 w-3 text-emerald-600" /> توصيل مجاني + خصم 15%
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {allow_eithar && <EitharToggle offerId={block.id} />}
          <Link
            to="/offers"
            search={campaign_id ? ({ campaign: campaign_id } as never) : undefined}
            className="ms-auto inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-pill transition active:scale-95"
          >
            انضم للجوار
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SduiOfferNeighborhoodPool;
