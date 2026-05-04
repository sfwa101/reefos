import type { LucideIcon } from "lucide-react";

export type PlanId = "loss" | "maintain" | "muscle" | "family";

export interface PlanDef {
  id: PlanId;
  title: string;
  icon: LucideIcon;
  calories: string;
  basePrice: number;
  color: string;
  tag: string;
}

export interface FrequencyDef {
  id: string;
  label: string;
  multiplier: number;
}

export interface DurationDef {
  id: number;
  label: string;
  weeks: number;
  discount: number;
}

export interface WeekDayDef {
  id: DayId;
  short: string;
  long: string;
}

export type DayId = "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri";
