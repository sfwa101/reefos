import { useCallback, useMemo, useState } from "react";
import { subscriptionMeals, type SubscriptionMeal } from "@/lib/subscriptionMeals";
import {
  PLANS,
  FREQUENCIES,
  DURATIONS,
  TIME_SLOTS,
  WEEK_DAYS,
} from "../constants";
import type { DayId, PlanId, PlanDef, FrequencyDef, DurationDef } from "../types";

export interface UseSubscriptionsLogic {
  // selections
  planId: PlanId;
  setPlanId: (id: PlanId) => void;
  freq: string;
  setFreq: (id: string) => void;
  dur: number;
  setDur: (id: number) => void;
  people: number;
  setPeople: (updater: (p: number) => number) => void;
  diets: Set<string>;
  toggleDiet: (v: string) => void;
  allergic: Set<string>;
  toggleAllergy: (v: string) => void;
  slot: string;
  setSlot: (v: string) => void;
  paused: boolean;
  togglePaused: () => void;
  dailyMeals: Partial<Record<DayId, string>>;
  pickerDay: DayId | null;
  openPicker: (day: DayId) => void;
  closePicker: () => void;
  pickMealForDay: (mealId: string) => void;
  autoFillWeek: () => void;
  // derived
  plan: PlanDef;
  freqObj: FrequencyDef;
  durObj: DurationDef;
  activeDays: DayId[];
  availableMeals: SubscriptionMeal[];
  filledCount: number;
  totalPrice: number;
}

const ACTIVE_DAYS_5: DayId[] = ["sun", "mon", "tue", "wed", "thu"];
const ACTIVE_DAYS_ALT: DayId[] = ["sat", "mon", "wed", "fri"];
const ACTIVE_DAYS_FULL: DayId[] = WEEK_DAYS.map((d) => d.id);

export function useSubscriptionsLogic(): UseSubscriptionsLogic {
  const [planId, setPlanId] = useState<PlanId>("maintain");
  const [freq, setFreq] = useState<string>(FREQUENCIES[0].id);
  const [dur, setDur] = useState<number>(DURATIONS[1].id);
  const [people, setPeople] = useState<number>(1);
  const [diets, setDiets] = useState<Set<string>>(new Set());
  const [allergic, setAllergic] = useState<Set<string>>(new Set());
  const [slot, setSlot] = useState<string>(TIME_SLOTS[1]);
  const [paused, setPaused] = useState<boolean>(false);
  const [dailyMeals, setDailyMeals] = useState<Partial<Record<DayId, string>>>({});
  const [pickerDay, setPickerDay] = useState<DayId | null>(null);

  // Safe lookups (no non-null assertions; fall back to first item).
  const plan: PlanDef = useMemo(
    () => PLANS.find((p) => p.id === planId) ?? PLANS[0],
    [planId],
  );
  const freqObj: FrequencyDef = useMemo(
    () => FREQUENCIES.find((f) => f.id === freq) ?? FREQUENCIES[0],
    [freq],
  );
  const durObj: DurationDef = useMemo(
    () => DURATIONS.find((d) => d.id === dur) ?? DURATIONS[0],
    [dur],
  );

  const activeDays: DayId[] = useMemo(() => {
    if (freq === "daily") return ACTIVE_DAYS_FULL;
    if (freq === "5days") return ACTIVE_DAYS_5;
    return ACTIVE_DAYS_ALT;
  }, [freq]);

  const availableMeals: SubscriptionMeal[] = useMemo(
    () => subscriptionMeals.filter((m) => m.fitsPlans.includes(planId)),
    [planId],
  );

  const filledCount = useMemo(
    () => activeDays.filter((d) => dailyMeals[d]).length,
    [activeDays, dailyMeals],
  );

  const totalPrice = useMemo(() => {
    const weekly = plan.basePrice * freqObj.multiplier * people;
    const total = weekly * durObj.weeks;
    return Math.round(total * (1 - durObj.discount));
  }, [plan, freqObj, durObj, people]);

  const toggleSet = (s: Set<string>, set: (n: Set<string>) => void, val: string) => {
    const n = new Set(s);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    set(n);
  };
  const toggleDiet = useCallback((v: string) => toggleSet(diets, setDiets, v), [diets]);
  const toggleAllergy = useCallback((v: string) => toggleSet(allergic, setAllergic, v), [allergic]);
  const togglePaused = useCallback(() => setPaused((p) => !p), []);

  const openPicker = useCallback((day: DayId) => setPickerDay(day), []);
  const closePicker = useCallback(() => setPickerDay(null), []);

  const pickMealForDay = useCallback(
    (mealId: string) => {
      if (!pickerDay) return;
      setDailyMeals((prev) => ({ ...prev, [pickerDay]: mealId }));
      setPickerDay(null);
    },
    [pickerDay],
  );

  const autoFillWeek = useCallback(() => {
    setDailyMeals((prev) => {
      const next: Partial<Record<DayId, string>> = { ...prev };
      activeDays.forEach((d, i) => {
        const candidate = availableMeals[i % Math.max(1, availableMeals.length)];
        if (!next[d] && candidate) next[d] = candidate.id;
      });
      return next;
    });
  }, [activeDays, availableMeals]);

  return {
    planId, setPlanId,
    freq, setFreq,
    dur, setDur,
    people, setPeople,
    diets, toggleDiet,
    allergic, toggleAllergy,
    slot, setSlot,
    paused, togglePaused,
    dailyMeals,
    pickerDay, openPicker, closePicker,
    pickMealForDay, autoFillWeek,
    plan, freqObj, durObj,
    activeDays, availableMeals,
    filledCount, totalPrice,
  };
}
