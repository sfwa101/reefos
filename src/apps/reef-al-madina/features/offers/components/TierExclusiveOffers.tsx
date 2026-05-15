import { Crown, Lock, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TierOffer = {
  id: string;
  title: string;
  tier: "silver" | "gold" | "platinum";
  description?: string;
};

export type TierExclusiveOffersProps = {
  offers: TierOffer[];
  userTier?: "bronze" | "silver" | "gold" | "platinum" | null;
  /** EGP missing to reach the next tier — drives the upsell CTA. */
  amountToUpgrade?: number;
  title?: string;
};

const tierRank: Record<NonNullable<TierExclusiveOffersProps["userTier"]>, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

const tierLabel: Record<TierOffer["tier"], string> = {
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const TierExclusiveOffers = ({
  offers,
  userTier = "bronze",
  amountToUpgrade = 500,
  title = "عروض حصرية للمستويات",
}: TierExclusiveOffersProps) => {
  if (offers.length === 0) return null;
  const myRank = tierRank[userTier ?? "bronze"];

  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Crown className="h-4 w-4 text-amber-500" />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {offers.map((o) => {
          const locked = tierRank[o.tier] > myRank;
          return (
            <div
              key={o.id}
              className="relative overflow-hidden rounded-2xl p-4 shadow-tile bg-gradient-to-br from-indigo-600 via-purple-500 to-fuchsia-500 text-white min-h-[120px]"
            >
              {/* sheen */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
              <p className="relative text-[10px] font-bold opacity-90">
                حصري {tierLabel[o.tier]}
              </p>
              <p className="relative font-display text-base font-extrabold leading-tight">
                {o.title}
              </p>
              {o.description && (
                <p className="relative mt-1 text-[11px] opacity-85">{o.description}</p>
              )}

              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/55 px-3 text-center backdrop-blur-md">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-md" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg ring-2 ring-amber-200/60">
                      <Lock className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-[11px] font-extrabold text-foreground">
                    حصري لمستوى {tierLabel[o.tier]}
                  </p>
                  <p className="text-[10px] leading-tight text-foreground/75">
                    اطلب بـ {amountToUpgrade} ج إضافية للترقية
                  </p>
                  <Button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[10px] font-bold text-background shadow"
                  >
                    <Sparkles className="h-3 w-3" />
                    رقّي مستواي
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TierExclusiveOffers;
