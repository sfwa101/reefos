import { memo } from "react";
import { X, Flame } from "lucide-react";
import type { SubscriptionMeal } from "@/lib/subscriptionMeals";
import { WEEK_DAYS } from "../constants";
import type { DayId } from "../types";

interface Props {
  pickerDay: DayId | null;
  availableMeals: SubscriptionMeal[];
  dailyMeals: Partial<Record<DayId, string>>;
  onPick: (mealId: string) => void;
  onClose: () => void;
}

const MealPickerSheet = memo(function MealPickerSheet({
  pickerDay, availableMeals, dailyMeals, onPick, onClose,
}: Props) {
  if (!pickerDay) return null;
  const dayLong = WEEK_DAYS.find((d) => d.id === pickerDay)?.long ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-[2rem] bg-background shadow-float animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 p-4">
          <div>
            <h4 className="font-display text-lg font-extrabold">اختر وجبة {dayLong}</h4>
            <p className="text-[11px] text-muted-foreground">السعر داخل الاشتراك مختلف عن الطلب الفردي</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto p-4 pb-8" style={{ maxHeight: "70vh" }}>
          {availableMeals.map((m) => {
            const isSelected = dailyMeals[pickerDay] === m.id;
            const savings = m.standalonePrice > 0
              ? Math.round(((m.standalonePrice - m.subscriptionPrice) / m.standalonePrice) * 100)
              : 0;
            return (
              <button
                key={m.id}
                onClick={() => onPick(m.id)}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-right transition ${
                  isSelected ? "bg-primary/10 ring-2 ring-primary" : "glass-strong"
                }`}
              >
                <img src={m.image} alt={m.shortName} className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-display text-sm font-extrabold leading-tight">{m.name}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {m.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] font-bold">{t}</span>
                    ))}
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
                      <Flame className="h-3 w-3" /> {m.calories}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground line-through tabular-nums">
                      {m.standalonePrice} ج.م مفرد
                    </span>
                    <span className="font-display text-sm font-extrabold text-primary tabular-nums">
                      {m.subscriptionPrice} ج.م · وفّر {savings}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default MealPickerSheet;
