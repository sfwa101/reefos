import { Crown, Lock } from "lucide-react";

export type TierOffer = {
  id: string;
  title: string;
  tier: "silver" | "gold" | "platinum";
  description?: string;
};

export type TierExclusiveOffersProps = {
  offers: TierOffer[];
  userTier?: "bronze" | "silver" | "gold" | "platinum" | null;
  title?: string;
};

const tierRank: Record<NonNullable<TierExclusiveOffersProps["userTier"]>, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

const TierExclusiveOffers = ({
  offers,
  userTier = "bronze",
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
              className={`relative overflow-hidden rounded-2xl p-4 shadow-tile ${
                locked
                  ? "bg-foreground/5 text-foreground/60"
                  : "bg-gradient-to-br from-indigo-600 to-purple-500 text-white"
              }`}
            >
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-1 text-foreground">
                    <Lock className="h-5 w-5" />
                    <p className="text-[10px] font-bold">مستوى {o.tier}+</p>
                  </div>
                </div>
              )}
              <p className="text-[10px] font-bold opacity-90">حصري {o.tier}</p>
              <p className="font-display text-base font-extrabold leading-tight">{o.title}</p>
              {o.description && <p className="mt-1 text-[11px] opacity-80">{o.description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TierExclusiveOffers;
