import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { BadgePercent, Truck, Zap } from "lucide-react";
import BackHeader from "@/components/BackHeader";
import BottomCTA from "@/components/BottomCTA";
import UniversalPremiumSkeleton from "@/components/UniversalPremiumSkeleton";
import { useCart } from "@/context/CartContext";
import { toLatin } from "@/lib/format";
import type { Product } from "@/lib/products";
import {
  DAYS, RECIPES, SECTIONS, getMealForHour,
  type Recipe, type RecipeSection,
} from "@/apps/reef-al-madina/features/recipes/data";
import DailyBrowser from "@/apps/reef-al-madina/features/recipes/components/DailyBrowser";
import WeeklyPlanner, { type DayPlan } from "@/apps/reef-al-madina/features/recipes/components/WeeklyPlanner";

// Heavy modal — lazy-loaded only when a recipe card is opened.
const RecipeModal = lazy(() => import("@/apps/reef-al-madina/features/recipes/components/RecipeModal"));

const FILTERS_LIST = ["كل الوصفات", "سريعة", "عائلية", "للأطفال", "صحية", "نباتية"];

const Recipes = () => {
  const { add } = useCart();
  const search = useSearch({ from: "/_app/store/recipes" }) as { tag?: string };
  const navigate = useNavigate({ from: "/store/recipes" });
  const tag = (search.tag ?? "").trim();
  const [filter, setFilter] = useState(FILTERS_LIST[0]);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [mode, setMode] = useState<"daily" | "weekly">("daily");
  const [activeMeal, setActiveMeal] = useState<RecipeSection>(() => getMealForHour(new Date().getHours()));

  // Live tick for "ends in" countdown.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [plan, setPlan] = useState<Record<string, DayPlan>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, {}])),
  );
  const [activeDay, setActiveDay] = useState(DAYS[0]);
  const [planServings, setPlanServings] = useState(2);

  const filtered = useMemo(() => {
    let list = RECIPES;
    if (tag) {
      list = list.filter(
        (r) => r.name.includes(tag) || r.ingredients.some((i) => i.name.includes(tag)),
      );
      if (list.length === 0) list = RECIPES;
    }
    if (filter === "كل الوصفات") return list;
    return list.filter(
      (r) =>
        r.category.includes(filter.replace("ة", "").replace("ال", "")) ||
        filter.includes(r.category),
    );
  }, [filter, tag]);

  const planSet = (day: string, section: RecipeSection, recipeId: string) =>
    setPlan((p) => ({ ...p, [day]: { ...p[day], [section]: p[day]?.[section] === recipeId ? undefined : recipeId } }));

  const planTotal = useMemo(() => {
    let sum = 0;
    Object.values(plan).forEach((day) => {
      SECTIONS.forEach((s) => {
        const id = day[s];
        if (id) {
          const r = RECIPES.find((x) => x.id === id);
          if (r) sum += r.basePrice * (planServings / r.baseServings);
        }
      });
    });
    return Math.round(sum);
  }, [plan, planServings]);

  const planMealsCount = useMemo(
    () => Object.values(plan).reduce((c, d) => c + Object.values(d).filter(Boolean).length, 0),
    [plan],
  );

  const subscribePlan = () => {
    Object.values(plan).forEach((day) => {
      SECTIONS.forEach((s) => {
        const id = day[s];
        if (!id) return;
        const r = RECIPES.find((x) => x.id === id);
        if (!r) return;
        const asProduct: Product = {
          id: `plan-${r.id}-${Date.now()}`,
          name: `${r.name} (${s})`,
          unit: `${toLatin(planServings)} أفراد`,
          price: Math.round(r.basePrice * (planServings / r.baseServings)),
          image: r.image,
          category: "وصفات",
          source: "recipes",
        };
        add(asProduct);
      });
    });
  };

  const suggestForDay = () => {
    setPlan((p) => ({
      ...p,
      [activeDay]: {
        إفطار: RECIPES.find((r) => r.section === "إفطار")!.id,
        غداء: RECIPES.find((r) => r.section === "غداء")!.id,
        عشاء: RECIPES.find((r) => r.section === "عشاء")!.id,
      },
    }));
  };

  return (
    <>
      <div className="space-y-5">
        <BackHeader title="وصفات الشيف" subtitle="منيو أسبوعي وذكي · 3 وجبات/يوم" accent="متجر" themeKey="recipes" />

        <section
          className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
          style={{ background: "linear-gradient(135deg, hsl(150 40% 25%), hsl(160 30% 35%))" }}
        >
          <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">وصفات الشيف</span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-white text-balance">
            تصفّح يوميًا<br />واطلب ما يحلو لك
          </h2>
          <p className="mt-1 text-xs text-white/80">3 وجبات/يوم · أو اشترك بخطة الأسبوع</p>
        </section>

        <div className="glass-strong flex rounded-full p-1 shadow-soft">
          <button
            onClick={() => setMode("daily")}
            className={`flex-1 rounded-full py-2 text-xs font-extrabold transition ${
              mode === "daily" ? "bg-foreground text-background shadow-pill" : "text-muted-foreground"
            }`}
          >
            اطلب اليوم
          </button>
          <button
            onClick={() => setMode("weekly")}
            className={`flex-1 rounded-full py-2 text-xs font-extrabold transition ${
              mode === "weekly" ? "bg-foreground text-background shadow-pill" : "text-muted-foreground"
            }`}
          >
            اشترك أسبوعيًا
          </button>
        </div>

        {mode === "daily" && (
          <>
            {tag && (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-500/15 p-3 ring-1 ring-amber-500/30 animate-fade-in">
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-extrabold text-amber-800 dark:text-amber-300">✨ وصفات مقترحة لـ</p>
                  <p className="truncate text-[12.5px] font-extrabold text-foreground">{tag}</p>
                </div>
                <button
                  onClick={() => navigate({ search: { tag: "" } as never, replace: true })}
                  className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-pill"
                >
                  عرض الكل
                </button>
              </div>
            )}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
              {[
                { icon: Truck, label: "توصيل مجاني فوق ٢٠٠ ج.م", c: "from-emerald-500/15 to-emerald-500/5", t: "text-emerald-700 dark:text-emerald-300" },
                { icon: Zap, label: "طازج يوميًا · يصل خلال ٤٥د", c: "from-amber-500/15 to-amber-500/5", t: "text-amber-700 dark:text-amber-300" },
                { icon: BadgePercent, label: "خصم ١٥٪ على أول طلب", c: "from-rose-500/15 to-rose-500/5", t: "text-rose-700 dark:text-rose-300" },
              ].map((p, i) => (
                <div key={i} className={`shrink-0 flex items-center gap-1.5 rounded-full bg-gradient-to-l ${p.c} px-3 py-1.5`}>
                  <p.icon className={`h-3.5 w-3.5 ${p.t}`} />
                  <span className={`text-[11px] font-extrabold ${p.t}`}>{p.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {mode === "weekly" && (
          <WeeklyPlanner
            plan={plan}
            activeDay={activeDay}
            setActiveDay={setActiveDay}
            planServings={planServings}
            setPlanServings={setPlanServings}
            planSet={planSet}
            suggestForDay={suggestForDay}
          />
        )}

        {mode === "daily" && (
          <DailyBrowser
            activeMeal={activeMeal}
            setActiveMeal={setActiveMeal}
            now={now}
            filter={filter}
            setFilter={setFilter}
            filtered={filtered}
            onOpen={setOpen}
          />
        )}

        <div className="h-32" />
        {open && (
          <Suspense fallback={<UniversalPremiumSkeleton variant="detail" />}>
            <RecipeModal recipe={open} onClose={() => setOpen(null)} />
          </Suspense>
        )}
      </div>

      {mode === "weekly" && (
        <BottomCTA>
          <button
            onClick={subscribePlan}
            disabled={planMealsCount === 0}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-pill transition active:scale-[0.98] disabled:opacity-50"
          >
            <span className="text-sm">
              {planMealsCount > 0
                ? `أرسل وجبات الأسبوع الآن · ${toLatin(planMealsCount)} وجبة`
                : "اختر وجبات للأسبوع"}
            </span>
            <span className="font-display text-base font-extrabold tabular-nums">{toLatin(planTotal)} ج.م</span>
          </button>
        </BottomCTA>
      )}
    </>
  );
};

export default Recipes;
