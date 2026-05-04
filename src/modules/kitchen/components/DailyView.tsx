import { memo, useMemo } from "react";
import { Search } from "lucide-react";
import { categoryLabels, type KitchenMeal } from "@/lib/kitchenMenu";
import { MealRow } from "./MealRow";
import type { KitchenCatFilter } from "../types";

interface Props {
  readonly query: string;
  readonly setQuery: (s: string) => void;
  readonly catFilter: KitchenCatFilter;
  readonly setCatFilter: (c: KitchenCatFilter) => void;
  readonly meals: ReadonlyArray<KitchenMeal>;
  readonly onOpen: (m: KitchenMeal) => void;
}

const DailyViewComponent = ({
  query,
  setQuery,
  catFilter,
  setCatFilter,
  meals,
  onOpen,
}: Props) => {
  const cats = useMemo<ReadonlyArray<{ id: KitchenCatFilter; label: string }>>(
    () => [
      { id: "all", label: "الكل" },
      { id: "grills", label: categoryLabels.grills },
      { id: "sandwiches", label: categoryLabels.sandwiches },
      { id: "crepes", label: categoryLabels.crepes },
      { id: "family", label: categoryLabels.family },
    ],
    [],
  );

  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن وجبة…"
          className="w-full rounded-full border border-border/60 bg-card py-3 pr-10 pl-4 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
        />
      </div>

      <div className="-mx-4 mb-3 overflow-x-auto px-4">
        <div className="flex gap-2">
          {cats.map((c) => {
            const active = catFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatFilter(c.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-pill"
                    : "bg-card text-foreground ring-1 ring-border/50"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {meals.length === 0 && (
          <p className="col-span-full rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
            لا توجد وجبات مطابقة.
          </p>
        )}
        {meals.map((m) => (
          <MealRow key={m.id} meal={m} onOpen={() => onOpen(m)} />
        ))}
      </div>
    </>
  );
};

export const DailyView = memo(DailyViewComponent);
