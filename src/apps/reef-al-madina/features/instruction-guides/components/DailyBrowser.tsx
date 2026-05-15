// Daily browser: meal tabs + filter chips + recipe list with marketing layers.

import { memo } from "react";
import { Clock, Flame as FlameIcon, Plus, Timer, TrendingUp, Zap } from "lucide-react";
import { toLatin } from "@/lib/format";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import {
  FILTERS, MARKETING, MEAL_WINDOWS, SECTIONS,
  isMealOpenNow, minutesUntilClose,
  type Recipe, type RecipeSection,
} from "@/apps/reef-al-madina/features/instruction-guides/data";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";

interface Props {
  activeMeal: RecipeSection;
  setActiveMeal: (s: RecipeSection) => void;
  now: Date;
  filter: string;
  setFilter: (s: string) => void;
  filtered: Recipe[];
  onOpen: (r: Recipe) => void;
}

function DailyBrowserImpl({ activeMeal, setActiveMeal, now, filter, setFilter, filtered, onOpen }: Props) {
  const { add } = useCart();
  const list = filtered.filter((r) => r.section === activeMeal);
  const openNow = isMealOpenNow(activeMeal, now);
  const minsLeft = minutesUntilClose(activeMeal, now);
  const win = MEAL_WINDOWS[activeMeal];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {SECTIONS.map((s) => {
          const w = MEAL_WINDOWS[s];
          const Icon = w.icon;
          const isActive = s === activeMeal;
          const open = isMealOpenNow(s, now);
          return (
            <Button
              key={s}
              onClick={() => setActiveMeal(s)}
              className={`relative overflow-hidden rounded-2xl px-3 py-3 text-center transition ease-apple ${
                isActive ? "bg-foreground text-background shadow-pill" : "glass-strong text-foreground"
              }`}
            >
              <Icon className={`mx-auto h-5 w-5 ${isActive ? "" : "text-primary"}`} />
              <p className="mt-1 font-display text-sm font-extrabold">{s}</p>
              <p className={`text-[9px] tabular-nums ${isActive ? "opacity-75" : "text-muted-foreground"}`}>{w.label}</p>
              {open && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className={`flex items-center justify-between rounded-2xl px-4 py-2.5 ${
        openNow ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}>
        <div className="flex items-center gap-2">
          {openNow ? <Zap className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
          <span className="text-[12px] font-extrabold">{openNow ? "متاح الآن" : "خارج وقت التقديم"}</span>
        </div>
        <span className="text-[11px] font-bold tabular-nums">
          {openNow
            ? `ينتهي خلال ${toLatin(Math.floor(minsLeft / 60))}س ${toLatin(minsLeft % 60)}د`
            : `يبدأ ${win.label}`}
        </span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
        {FILTERS.map((f) => (
          <Button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              filter === f ? "bg-foreground text-background" : "glass text-foreground"
            }`}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((r) => {
          const m = MARKETING[r.id] ?? {};
          const discountPct = m.oldPrice ? Math.round((1 - r.basePrice / m.oldPrice) * 100) : 0;
          const lowStock = (m.remaining ?? 99) <= 10;
          return (
            <div key={r.id} className="glass-strong relative overflow-hidden rounded-2xl shadow-soft">
              <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1">
                {m.badge && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-extrabold text-background shadow-pill">{m.badge}</span>
                )}
                {discountPct > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-pill">-{toLatin(discountPct)}٪</span>
                )}
              </div>

              <Button onClick={() => onOpen(r)} className="flex w-full text-right">
                <div className="relative h-32 w-32 shrink-0">
                  <OptimizedImage
                    src={r.image}
                    alt={r.name}
                    width={256}
                    height={256}
                    wrapperClassName="absolute inset-0"
                    className="h-full w-full object-cover"
                  />
                  {m.soldToday && (
                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                      <TrendingUp className="h-3 w-3" /> {toLatin(m.soldToday)} اليوم
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-3 text-right">
                  <div>
                    <h4 className="font-display text-base font-extrabold leading-tight text-foreground">{r.name}</h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{r.category}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-2.5 text-[10px] text-muted-foreground tabular-nums">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {toLatin(r.cookTime)}د</span>
                      <span className="flex items-center gap-1"><FlameIcon className="h-3 w-3" /> {toLatin(r.calories)}</span>
                    </div>
                    <div className="flex flex-col items-end leading-none">
                      {m.oldPrice && (
                        <span className="text-[10px] text-muted-foreground line-through tabular-nums">{toLatin(m.oldPrice)}</span>
                      )}
                      <span className="font-display text-base font-extrabold text-primary tabular-nums">
                        {toLatin(r.basePrice)} <span className="text-[10px] text-muted-foreground">ج.م</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Button>

              <div className="flex items-center justify-between border-t border-border/40 bg-background/30 px-3 py-2">
                {lowStock ? (
                  <span className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                    <Timer className="h-3 w-3" /> متبقي {toLatin(m.remaining!)} فقط
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground">تخصيص المكونات لتقليل السعر</span>
                )}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    add({
                      id: `recipe-quick-${r.id}-${Date.now()}`,
                      name: r.name,
                      unit: "وصفة شيف",
                      price: r.basePrice,
                      image: r.image,
                      category: "وصفات",
                      source: "recipes",
                    });
                  }}
                  className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground shadow-pill active:scale-95"
                >
                  <Plus className="h-3 w-3" strokeWidth={3} />
                  أضف سريع
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(DailyBrowserImpl);
