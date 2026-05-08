/**
 * AmanahTierProgress — minimalist tier-progress strip for the SDUI Home.
 *
 * Reads the signed-in customer's cumulative spend (from `profile.total_spent`
 * if present, else 0) and renders a slim Apple-style progress bar with the
 * current tier label and the remaining EGP to the next rank. Pure presentation
 * — no fetching, no orchestrator coupling.
 */
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { tierProgress } from "@/lib/tiers";
import { toLatin } from "@/lib/format";

const AmanahTierProgress = () => {
  const { profile } = useAuth();
  const spend = useMemo(() => {
    const p = profile as unknown as { total_spent?: number | null } | null;
    return Math.max(0, Number(p?.total_spent ?? 0));
  }, [profile]);

  const { tier, next, remaining, pct } = useMemo(() => tierProgress(spend), [spend]);
  const TierIcon = tier.icon;

  return (
    <section dir="rtl" aria-label="مستواك" className="px-1">
      <div className="rounded-2xl border border-foreground/8 bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
              <TierIcon className="h-3.5 w-3.5 text-foreground/70" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">مستواك الحالي</p>
              <p className="font-display text-sm font-bold text-foreground">{tier.label}</p>
            </div>
          </div>
          {next ? (
            <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
              {toLatin(pct)}%
            </span>
          ) : (
            <span className="text-[11px] font-bold text-foreground/70">أعلى مستوى ✨</span>
          )}
        </div>

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/8">
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {next ? (
          <p className="mt-2 text-[11px] font-medium tabular-nums text-muted-foreground">
            تبقى <strong className="text-foreground/80">{toLatin(Math.round(remaining))} ج.م</strong>{" "}
            للترقية إلى <strong className="text-foreground/80">{next.label}</strong>
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-medium text-muted-foreground">
            تستمتع بأقصى مزايا الكاش باك ونقاط الولاء.
          </p>
        )}
      </div>
    </section>
  );
};

export default AmanahTierProgress;
