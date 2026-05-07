import { motion } from "framer-motion";
import { Users, TrendingDown, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { GroupBuyCampaign, ResolvedTierState } from "../types/group-buy.types";

interface Props {
  campaign: GroupBuyCampaign;
  tierState: ResolvedTierState;
  className?: string;
}

const formatCountdown = (target: string): string => {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "انتهى";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د ${s}ث`;
};

export const GroupBuyTicker = ({ campaign, tierState, className }: Props) => {
  const [countdown, setCountdown] = useState(() => formatCountdown(campaign.expires_at));

  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(campaign.expires_at)), 1000);
    return () => clearInterval(id);
  }, [campaign.expires_at]);

  const { currentPrice, nextTier, unitsToNextDrop, progressPct } = tierState;

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {campaign.current_quantity} / {campaign.target_quantity} وحدة
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-primary">
          <Clock className="h-4 w-4" />
          <span dir="ltr">{countdown}</span>
        </div>
      </div>

      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="text-xs text-muted-foreground">السعر الحالي</div>
          <div className="text-2xl font-bold text-foreground">
            {currentPrice.toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">ج.م / وحدة</span>
          </div>
        </div>
        {nextTier && unitsToNextDrop > 0 && (
          <motion.div
            key={nextTier.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground"
          >
            <TrendingDown className="h-3 w-3" />
            <span>
              {unitsToNextDrop} وحدة لخصم {nextTier.price_per_unit.toFixed(2)} ج.م
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
