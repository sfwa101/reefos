/**
 * HeroBanner — Home Goods storefront hero panel.
 * Visual stem cell, no state. Driven by the active store theme.
 *
 * Phase 20 refactor: removed raw tailwind palette leaks
 * (`bg-white/70`, `text-emerald-700`, `text-amber-700`, `text-sky-700`)
 * in favour of semantic tokens (`bg-card/70`, `text-success`, `text-warning`,
 * `text-info`). Now respects light/dark + every accent theme.
 */
import { Crown, ShieldCheck, Truck, Wrench } from "lucide-react";

export const HeroBanner = ({
  theme,
}: {
  theme: { hue: string; ink: string; gradient: string };
}) => (
  <section className="px-4 pt-2">
    <div
      className="relative overflow-hidden rounded-3xl p-5 shadow-tile"
      style={{ background: theme.gradient }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-card/75 px-2.5 py-1 text-[10px] font-extrabold backdrop-blur"
            style={{ color: `hsl(${theme.hue})` }}
          >
            <Crown className="h-3 w-3" /> متجر بيتك الذكي
          </span>
          <h1
            className="mt-2 font-display text-2xl font-extrabold leading-tight text-balance"
            style={{ color: `hsl(${theme.ink})` }}
          >
            من أصغر أداة<br />إلى أكبر جهاز
          </h1>
          <p
            className="mt-1 text-[12.5px] font-medium opacity-80"
            style={{ color: `hsl(${theme.ink})` }}
          >
            تسليم فوري · ضمان وكيل · حجز مسبق بدفعة 25%
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-2 py-1 text-[10px] font-bold text-success backdrop-blur">
              <Truck className="h-3 w-3" /> توصيل اليوم
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-2 py-1 text-[10px] font-bold text-warning backdrop-blur">
              <ShieldCheck className="h-3 w-3" /> ضمان وكيل
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-card/85 px-2 py-1 text-[10px] font-bold text-info backdrop-blur">
              <Wrench className="h-3 w-3" /> صيانة معتمدة
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
