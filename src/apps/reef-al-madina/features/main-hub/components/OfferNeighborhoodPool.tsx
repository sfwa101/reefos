/**
 * OfferNeighborhoodPool — Phase 26 "Neighborhood Pulse".
 *
 * Minimalist single-card section that surfaces a live group-buy / neighborhood
 * offer pulled from `app_settings.neighborhood_pulse` (admin-controlled). When
 * the admin has not configured one, falls back to a quiet hero showing the
 * current delivery zone so the section stays warm but never noisy.
 */
import { Users, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { useLocationStatic } from "@/context/LocationContext";

type PulsePayload = {
  title?: string;
  body?: string;
  cta_label?: string;
  cta_to?: "/offers" | "/sections";
  enabled?: boolean;
};

const FALLBACK: PulsePayload = {
  enabled: true,
  title: "نبض الحي",
  body: "اطلب مع جيرانك ووفّر على التوصيل في كل مرة.",
  cta_label: "اعرف المزيد",
  cta_to: "/offers",
};

export const OfferNeighborhoodPool = () => {
  const { value } = useSystemSetting<PulsePayload>("neighborhood_pulse", FALLBACK);
  const { zone } = useLocationStatic();
  if (value.enabled === false) return null;

  return (
    <section dir="rtl" className="px-1">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 ring-1 ring-primary/15">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <Sparkles className="h-3 w-3" strokeWidth={2.6} />
              {zone.shortName}
            </p>
            <h3 className="mt-1 font-display text-[17px] font-extrabold text-foreground">
              {value.title ?? FALLBACK.title}
            </h3>
            <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
              {value.body ?? FALLBACK.body}
            </p>
            <Link
              to={value.cta_to ?? "/offers"}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-extrabold text-primary-foreground active:scale-[0.97]"
            >
              {value.cta_label ?? FALLBACK.cta_label}
            </Link>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Users className="h-5 w-5" strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default OfferNeighborhoodPool;
