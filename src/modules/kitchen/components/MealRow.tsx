import { memo } from "react";
import { Flame, Star } from "lucide-react";
import { fmtMoney, toLatin } from "@/lib/format";
import { badgeLabel, type KitchenMeal } from "@/lib/kitchenMenu";

interface Props {
  readonly meal: KitchenMeal;
  readonly onOpen: () => void;
  readonly disabled?: boolean;
}

const MealRowComponent = ({ meal, onOpen, disabled }: Props) => {
  const startPrice = Math.min(...meal.sizes.map((s) => s.price));
  return (
    <button
      onClick={onOpen}
      disabled={disabled}
      className={`group flex gap-3 overflow-hidden rounded-3xl bg-card p-3 text-right shadow-tile ring-1 ring-border/40 transition active:scale-[0.99] ${
        disabled ? "opacity-60 grayscale" : "hover:ring-primary/30"
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
        <img
          src={meal.image}
          alt={meal.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {meal.badge && !disabled && (
          <span className="absolute right-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground">
            {badgeLabel[meal.badge]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-sm font-extrabold leading-tight">
            {meal.name}
          </h3>
          <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 tabular-nums">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {toLatin(meal.rating)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
          {meal.short}
        </p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3" /> {toLatin(meal.nutrition.kcal)} سعرة
            </span>
          </div>
          {disabled ? (
            <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
              انتهى وقت الحجز
            </span>
          ) : (
            <span className="rounded-full bg-primary-soft px-3 py-1.5 font-display text-xs font-extrabold text-primary tabular-nums">
              يبدأ من {fmtMoney(startPrice)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export const MealRow = memo(MealRowComponent);
