import type { MeatMainGroup } from "./types";

/**
 * Top-level meat groups + their sub-categories.
 * Pure data — moved out of the page so it can be tree-shaken / reused.
 */
export const MEAT_GROUPS: ReadonlyArray<MeatMainGroup> = [
  {
    id: "red",
    name: "لحوم حمراء",
    subs: [
      { id: "all-red", label: "الكل" },
      { id: "بتلو", label: "بتلو" },
      { id: "ضأن", label: "ضأن" },
      { id: "كندوز", label: "كندوز" },
      { id: "مفروم", label: "مفروم" },
    ],
  },
  {
    id: "poultry",
    name: "دواجن",
    subs: [
      { id: "all-poultry", label: "الكل" },
      { id: "بلدي", label: "بلدي" },
      { id: "صدور", label: "صدور" },
      { id: "أوراك", label: "أوراك" },
      { id: "بط وأرانب", label: "بط وأرانب" },
    ],
  },
  {
    id: "fish",
    name: "أسماك وبحريات",
    subs: [
      { id: "all-fish", label: "الكل" },
      { id: "بحري", label: "بحري" },
      { id: "مزارع", label: "مزارع" },
      { id: "فيليه", label: "فيليه" },
      { id: "بحريات", label: "بحريات" },
    ],
  },
  {
    id: "frozen",
    name: "مجمدات",
    subs: [
      { id: "all-frozen", label: "الكل" },
      { id: "خضار", label: "خضار مجمدة" },
      { id: "وجبات", label: "وجبات سريعة" },
    ],
  },
] as const;

/** Map a product subCategory to its top-level group id. */
export const groupOf = (sub?: string): string => {
  if (!sub) return "red";
  if (sub === "لحوم حمراء" || sub === "مفرومات") return "red";
  if (sub === "دواجن") return "poultry";
  if (sub === "أسماك" || sub === "بحريات") return "fish";
  if (sub === "مجمدات") return "frozen";
  return "red";
};
