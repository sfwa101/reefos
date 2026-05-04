import { memo } from "react";
import { Clock, UtensilsCrossed, Flame, ChefHat } from "lucide-react";
import { subscriptionMeals } from "@/lib/subscriptionMeals";
import { WEEK_DAYS } from "../constants";
import type { DayId } from "../types";

interface Props {
  activeDays: DayId[];
  dailyMeals: Partial<Record<DayId, string>>;
  filledCount: number;
  openPicker: (day: DayId) => void;
  autoFillWeek: () => void;
}

const DailyMealPicker = memo(function DailyMealPicker({
  activeDays, dailyMeals, filledCount, openPicker, autoFillWeek,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="font-display text-xl font-extrabold flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          اختر وجبات الأسبوع
        </h3>
        <button
          onClick={autoFillWeek}
          className="text-[11px] font-bold text-primary underline-offset-2 hover:underline"
        >
          ملء تلقائي
        </button>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        اختر وجبة لكل يوم من أيام اشتراكك ({filledCount}/{activeDays.length})
      </p>

      <div className="grid grid-cols-1 gap-2">
        {activeDays.map((dayId) => {
          const day = WEEK_DAYS.find((d) => d.id === dayId);
          if (!day) return null;
          const mealId = dailyMeals[dayId];
          const meal = mealId ? subscriptionMeals.find((m) => m.id === mealId) : null;
          return (
            <button
              key={dayId}
              onClick={() => openPicker(dayId)}
              className={`flex items-center gap-3 rounded-2xl p-3 text-right transition ease-apple ${
                meal ? "glass-strong shadow-soft" : "border-2 border-dashed border-border bg-card/40"
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="text-[10px] font-bold leading-none">{day.short}</span>
              </div>
              {meal ? (
                <>
                  <img src={meal.image} alt={meal.shortName} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0 text-right">
                    <p className="truncate font-display text-sm font-extrabold">{meal.shortName}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      <Flame className="inline h-3 w-3" /> {meal.calories} سعرة
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">تغيير</span>
                </>
              ) : (
                <>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-bold text-muted-foreground">اضغط لاختيار وجبة</p>
                    <p className="text-[10px] text-muted-foreground">من قائمة الشيف</p>
                  </div>
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">
            يمكنك تغيير وجبة أي يوم قبل <span className="tabular-nums">8 ساعات</span> من موعد الاستلام
          </p>
          <p className="mt-0.5 opacity-80">بعد ذلك يبدأ الشيف في التحضير ولا يمكن التعديل.</p>
        </div>
      </div>
    </section>
  );
});

export default DailyMealPicker;
