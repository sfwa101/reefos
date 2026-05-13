/**
 * CartLogisticsBanners
 * ----------------------------------------------------------------
 * Renders warnings (yellow) and blockers (red) produced by the
 * Logistics Engine for the active cart context.
 *
 * Phase 12.5 — pure presentational component. Pricing & quote
 * computation live in the cart orchestrator path.
 */
import { AlertTriangle, OctagonAlert } from "lucide-react";
import { toLatin } from "@/lib/format";
import type { LogisticsQuote } from "@/core/logistics/core/types";

type Props = {
  quote: LogisticsQuote | null;
};

export const CartLogisticsBanners = ({ quote }: Props) => {
  if (!quote) return null;
  const { warnings, blockers } = quote;
  if (warnings.length === 0 && blockers.length === 0) return null;

  return (
    <div className="space-y-2">
      {blockers.map((b) => (
        <div
          key={b.code}
          className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-destructive ring-1 ring-destructive/20"
          role="alert"
        >
          <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-extrabold leading-5">{b.message}</p>
            {b.code === "below_min_order" && (
              <p className="mt-0.5 text-[11px] font-bold opacity-80">
                باقي {toLatin(Math.ceil(b.shortfall))} ج.م لإكمال الحد الأدنى.
              </p>
            )}
          </div>
        </div>
      ))}

      {warnings.map((w) => (
        <div
          key={w.code}
          className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-50 px-3 py-2.5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-[11.5px] font-bold leading-5">{w.message}</p>
        </div>
      ))}
    </div>
  );
};
