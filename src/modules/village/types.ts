import type { HealthTag } from "@/lib/villageMeta";

export type RoutineFrequency = "weekly" | "biweekly";

export type RoutineRecord = {
  productId: string;
  frequency: RoutineFrequency;
  discountPct: number;
  createdAt: string;
};

export type SubCat = { id: string; label: string };

export type VillageTagFilter = HealthTag | "all";

export const SUB_CATS: SubCat[] = [
  { id: "all", label: "الكل" },
  { id: "عسل ومربى", label: "عسل ومربى" },
  { id: "ألبان بلدية", label: "ألبان بلدية" },
  { id: "مخللات", label: "مخللات" },
];

export const ROUTINE_KEY = "reef-village-routines-v1";
