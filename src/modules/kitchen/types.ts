import type { KitchenMeal } from "@/lib/kitchenMenu";

export type KitchenTab = "weekly" | "daily";
export type KitchenCatFilter = "all" | KitchenMeal["category"];
