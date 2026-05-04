import { memo } from "react";
import { AlarmClock } from "lucide-react";
import { dayShortAr, dayNamesAr, type KitchenMeal } from "@/lib/kitchenMenu";
import { toLatin } from "@/lib/format";
import { MealRow } from "./MealRow";

const formatDeadline = (d: Date, dayName: string): string => {
  const dn = dayShortAr[d.getDay() % 7];
  const hh = d.getHours();
  const period = hh >= 12 ? "م" : "ص";
  const h12 = ((hh + 11) % 12) + 1;
  return `يُغلق حجز ${dayName} يوم ${dn} الساعة ${toLatin(h12)} ${period}`;
};

interface Props {
  readonly activeDay: number;
  readonly setActiveDay: (d: number) => void;
  readonly meals: ReadonlyArray<KitchenMeal>;
  readonly deadline: Date;
  readonly isClosed: boolean;
  readonly onOpen: (m: KitchenMeal) => void;
}

const WeeklyViewComponent = ({
  activeDay,
  setActiveDay,
  meals,
  deadline,
  isClosed,
  onOpen,
}: Props) => (
  <>
    {/* Day picker — mobile-first horizontal snap */}
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="flex snap-x snap-mandatory gap-2">
        {dayShortAr.map((name, i) => {
          const active = i === activeDay;
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`flex shrink-0 snap-start flex-col items-center justify-center rounded-2xl px-4 py-2 transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-pill"
                  : "bg-card text-foreground ring-1 ring-border/50"
              }`}
            >
              <span className="text-[10px] opacity-80">يوم</span>
              <span className="font-display text-sm font-extrabold">
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Deadline banner */}
    <div
      className={`mt-3 flex items-center gap-2 rounded-2xl border p-3 text-xs font-bold ${
        isClosed
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}
    >
      <AlarmClock className="h-4 w-4 shrink-0" />
      <span>
        {isClosed
          ? `انتهى وقت حجز ${dayNamesAr[activeDay]} — جرّب اليوم التالي`
          : formatDeadline(deadline, dayNamesAr[activeDay])}
      </span>
    </div>

    {/* Mobile-first grid: 1 col → 2 cols → 3 cols */}
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {meals.length === 0 && (
        <p className="col-span-full rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
          لا توجد وجبات مجدولة لهذا اليوم بعد.
        </p>
      )}
      {meals.map((m) => (
        <MealRow
          key={m.id}
          meal={m}
          disabled={isClosed}
          onOpen={() => {
            if (!isClosed) onOpen(m);
          }}
        />
      ))}
    </div>
  </>
);

export const WeeklyView = memo(WeeklyViewComponent);
