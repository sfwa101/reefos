import { Sparkles, Heart, Dumbbell } from "lucide-react";
import type { PlanDef, FrequencyDef, DurationDef, WeekDayDef } from "./types";

export const PLANS: PlanDef[] = [
  { id: "loss",     title: "خسارة الوزن",         icon: Sparkles, calories: "1200 سعرة/يوم",       basePrice: 1850, color: "from-rose-500 to-pink-400",     tag: "الأكثر طلبًا" },
  { id: "maintain", title: "الحفاظ على الوزن",    icon: Heart,    calories: "1800 سعرة/يوم",       basePrice: 2200, color: "from-emerald-500 to-teal-400",  tag: "متوازن" },
  { id: "muscle",   title: "بناء العضلات",        icon: Dumbbell, calories: "2400 سعرة/يوم",       basePrice: 2650, color: "from-amber-500 to-orange-400",  tag: "بروتين عالي" },
  { id: "family",   title: "عائلية",              icon: Heart,    calories: "وجبة لأفراد العائلة", basePrice: 3850, color: "from-violet-500 to-indigo-500", tag: "للعائلات" },
];

export const FREQUENCIES: FrequencyDef[] = [
  { id: "daily",  label: "يومي · 7 أيام", multiplier: 1 },
  { id: "5days",  label: "5 أيام عمل",    multiplier: 0.75 },
  { id: "alt",    label: "يوم ويوم",      multiplier: 0.55 },
];

export const DURATIONS: DurationDef[] = [
  { id: 1,  label: "أسبوع",   weeks: 1,  discount: 0 },
  { id: 4,  label: "شهر",     weeks: 4,  discount: 0.05 },
  { id: 12, label: "3 أشهر",  weeks: 12, discount: 0.12 },
];

export const DIET_PREFS = ["نباتي", "بدون جلوتين", "كيتو", "حلال", "خالي لاكتوز"];
export const ALLERGIES  = ["مكسرات", "بيض", "أسماك", "صويا", "قمح"];
export const TIME_SLOTS = ["7-9 ص", "11-1 م", "5-7 م", "8-10 م"];

export const WEEK_DAYS: WeekDayDef[] = [
  { id: "sat", short: "سبت",    long: "السبت" },
  { id: "sun", short: "أحد",    long: "الأحد" },
  { id: "mon", short: "اثنين",  long: "الاثنين" },
  { id: "tue", short: "ثلاثاء", long: "الثلاثاء" },
  { id: "wed", short: "أربعاء", long: "الأربعاء" },
  { id: "thu", short: "خميس",   long: "الخميس" },
  { id: "fri", short: "جمعة",   long: "الجمعة" },
];
