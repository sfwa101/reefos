/**
 * AmanahLockShield — renders a locked offer card when the user's Amanah
 * tier is below the block's required tier. Drives upgrade conversion.
 */
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIER_LABEL = {
  bronze: "برونز",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
} as const;

export const AmanahLockShield = ({
  tier,
  title,
}: {
  tier: keyof typeof TIER_LABEL;
  title?: string;
}) => (
  <section
    dir="rtl"
    className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-fuchsia-500/10 p-5 text-center shadow-tile"
  >
    <div className="pointer-events-none absolute inset-0 backdrop-blur-[2px]" />
    <div className="relative flex flex-col items-center gap-2">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-white shadow-lg ring-2 ring-amber-200/60">
        <Lock className="h-5 w-5" />
      </div>
      <p className="font-display text-sm font-extrabold">
        {title ?? "عرض حصري"} — لمستوى {TIER_LABEL[tier]}+
      </p>
      <p className="text-[11px] text-muted-foreground">
        ارفع مستوى الأمانة لفتح هذا العرض
      </p>
      <Button
        type="button"
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background shadow"
      >
        <Sparkles className="h-3 w-3" />
        كيف أرفع مستواي؟
      </Button>
    </div>
  </section>
);
