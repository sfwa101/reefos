// Weekly meal-plan builder: day strip + section choices + servings.

import { memo } from "react";
import { Calendar, Check, Minus, Plus, Sparkles } from "lucide-react";
import { toLatin } from "@/lib/format";
import { DAYS, RECIPES, SECTIONS, type RecipeSection } from "@/apps/reef-al-madina/features/instruction-guides/data";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";

export type DayPlan = Partial<Record<RecipeSection, string>>;

interface Props {
  plan: Record<string, DayPlan>;
  activeDay: string;
  setActiveDay: (d: string) => void;
  planServings: number;
  setPlanServings: (n: number | ((s: number) => number)) => void;
  planSet: (day: string, section: RecipeSection, recipeId: string) => void;
  suggestForDay: () => void;
}

function WeeklyPlannerImpl({
  plan, activeDay, setActiveDay, planServings, setPlanServings, planSet, suggestForDay,
}: Props) {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl bg-primary-soft/60 p-3 text-[11px] leading-relaxed text-foreground/80">
        اختر وجبات الأسبوع كاملة وسنرسلها إليك <b>فور تأكيد الاشتراك</b> في بداية الأسبوع. يمكنك تعديل أي وجبة قبل ٨ ساعات من موعد الاستلام.
      </div>
      <div className="flex items-baseline justify-between px-1">
        <h3 className="font-display text-xl font-extrabold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> منيو الأسبوع
        </h3>
        <Button onClick={suggestForDay} className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold text-primary">
          <Sparkles className="h-3 w-3" /> اقترح يومي
        </Button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {DAYS.map((d) => {
          const filledCount = Object.values(plan[d] ?? {}).filter(Boolean).length;
          const isActive = d === activeDay;
          return (
            <Button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-center transition ease-apple ${
                isActive ? "bg-foreground text-background shadow-pill" : "glass-strong"
              }`}
            >
              <p className="text-[10px] font-medium opacity-80">{d}</p>
              <p className="text-[10px] font-extrabold tabular-nums">{toLatin(filledCount)}/3</p>
            </Button>
          );
        })}
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s) => {
          const choices = RECIPES.filter((r) => r.section === s);
          const selected = plan[activeDay]?.[s];
          return (
            <div key={s} className="glass-strong rounded-2xl p-3 shadow-soft">
              <p className="mb-2 px-1 font-display text-sm font-extrabold">{s}</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 no-scrollbar">
                {choices.map((r) => {
                  const isSel = selected === r.id;
                  const price = Math.round(r.basePrice * (planServings / r.baseServings));
                  return (
                    <Button
                      key={r.id}
                      onClick={() => planSet(activeDay, s, r.id)}
                      className={`relative w-32 shrink-0 overflow-hidden rounded-2xl text-right transition ${
                        isSel ? "ring-2 ring-primary" : "bg-background/60"
                      }`}
                    >
                      <OptimizedImage
                        src={r.image}
                        alt={r.name}
                        width={256}
                        height={160}
                        className="h-20 w-full object-cover"
                      />
                      <div className="p-2">
                        <p className="line-clamp-2 text-[11px] font-bold leading-tight">{r.name}</p>
                        <p className="mt-1 text-[10px] font-extrabold text-primary tabular-nums">{toLatin(price)} ج.م</p>
                      </div>
                      {isSel && (
                        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-strong flex items-center justify-between rounded-2xl p-4 shadow-soft">
        <div>
          <p className="font-display text-sm font-extrabold">عدد الأفراد للخطة</p>
          <p className="text-[11px] text-muted-foreground">يضرب سعر كل وجبة بالكمية</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setPlanServings((s) => Math.max(1, s - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-6 text-center font-display text-lg font-extrabold tabular-nums">{toLatin(planServings)}</span>
          <Button onClick={() => setPlanServings((s) => Math.min(8, s + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

export default memo(WeeklyPlannerImpl);
