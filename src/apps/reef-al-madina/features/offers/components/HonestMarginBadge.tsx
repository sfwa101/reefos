/**
 * Baraka Engine — Honest Margin transparency badge.
 * Renders a small chip showing the seller's true margin on this offer
 * to honour the Sovereign Doctrine of Radical Transparency.
 */
import { ShieldCheck } from "lucide-react";

export const HonestMarginBadge = ({ marginPct }: { marginPct: number }) => (
  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
    <ShieldCheck className="h-3 w-3" />
    هامش شفاف {marginPct.toFixed(0)}%
  </div>
);

export default HonestMarginBadge;
