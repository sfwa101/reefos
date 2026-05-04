import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dailyMeals,
  weeklyMeals,
  getBookingDeadline,
  type KitchenMeal,
} from "@/lib/kitchenMenu";
import type { KitchenCatFilter, KitchenTab } from "../types";

/**
 * useKitchenLogic — central state for the kitchen catalog.
 * Owns: tab, active day, filters, search, open meal sheet, and the
 * minute-tick clock used for booking-deadline countdown.
 */
export function useKitchenLogic() {
  const [tab, setTab] = useState<KitchenTab>("daily");
  const [activeDay, setActiveDay] = useState<number>(() => new Date().getDay());
  const [catFilter, setCatFilter] = useState<KitchenCatFilter>("all");
  const [query, setQuery] = useState<string>("");
  const [openMeal, setOpenMeal] = useState<KitchenMeal | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Tick every minute so deadline countdown stays fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dayMeals = useMemo<ReadonlyArray<KitchenMeal>>(
    () => weeklyMeals.filter((m) => m.day === activeDay),
    [activeDay],
  );

  const deadline = useMemo<Date>(
    () => getBookingDeadline(activeDay, now),
    [activeDay, now],
  );

  const isClosed = deadline.getTime() <= now.getTime();

  const filteredDaily = useMemo<ReadonlyArray<KitchenMeal>>(() => {
    return dailyMeals.filter((m) => {
      if (catFilter !== "all" && m.category !== catFilter) return false;
      if (query && !m.name.includes(query) && !m.short.includes(query))
        return false;
      return true;
    });
  }, [catFilter, query]);

  const closeMeal = useCallback(() => setOpenMeal(null), []);

  return {
    // state
    tab,
    setTab,
    activeDay,
    setActiveDay,
    catFilter,
    setCatFilter,
    query,
    setQuery,
    openMeal,
    setOpenMeal,
    closeMeal,
    // derived
    dayMeals,
    deadline,
    isClosed,
    filteredDaily,
  } as const;
}
