/**
 * DynamicBadges — derives runtime visual badges from product intelligence.
 * Currently emits the "🌱 طازج اليوم" badge when batch_received_at < 24h.
 */
import { memo } from "react";
import { Sparkles } from "lucide-react";
import {
  isFreshToday,
  readProductIntelligence,
} from "../types/capabilities";
import type { Product } from "@/lib/products";

interface Props {
  readonly product: Product;
  readonly className?: string;
}

const DynamicBadgesImpl = ({ product, className }: Props) => {
  const intel = readProductIntelligence(product.metadata);
  const fresh = isFreshToday(intel.batchReceivedAt);
  const hasBulk = intel.bulkTiers.length > 0;

  if (!fresh && !hasBulk) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {fresh && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300">
          🌱 طازج اليوم
        </span>
      )}
      {hasBulk && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300">
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} />
          عرض الجملة
        </span>
      )}
    </div>
  );
};

export const DynamicBadges = memo(DynamicBadgesImpl);
DynamicBadges.displayName = "DynamicBadges";
