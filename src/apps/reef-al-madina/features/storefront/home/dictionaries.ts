/**
 * Home Storefront — UI dictionaries (NOT product data).
 *
 * Pure constants:
 *   • CATS — category pill rows (with icons + labels)
 *   • CAT_TO_SUBCAT — maps a CatId pill to one or more DB `sub_category`
 *     strings (so filtering against Supabase rows is semantic, not
 *     string-equality).
 *   • BUNDLES — curated bundle definitions; itemIds reference DB product
 *     IDs (`home-001` … `home-010`).
 *   • BESTSELLER_IDS — DB product IDs surfaced in the Bestsellers rail.
 *   • SORTS — sort dropdown labels.
 *   • fmt — Egyptian-pound formatter.
 *
 * No Supabase reads here. The orchestrator hydrates products from
 * `useProductsBySourceQuery("home")`.
 */
import {
  ChefHat,
  Lamp,
  Microwave,
  Sparkle,
  Sparkles,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";

import { toLatin } from "@/lib/format";
import type { Bundle, CatId, SortId } from "./types";

export const CATS: { id: CatId; name: string; icon: LucideIcon }[] = [
  { id: "all", name: "الكل", icon: Sparkle },
  { id: "majors", name: "أجهزة كهربائية كبرى", icon: WashingMachine },
  { id: "small", name: "أجهزة مطبخ صغيرة", icon: Microwave },
  { id: "kitchen", name: "أدوات مطبخ", icon: ChefHat },
  { id: "clean", name: "أدوات تنظيف", icon: Sparkles },
  { id: "decor", name: "ديكور ذكي", icon: Lamp },
];

/**
 * Maps a UI category pill to the DB `sub_category` strings it should
 * include. "all" matches everything.
 */
export const CAT_TO_SUBCAT: Record<Exclude<CatId, "all">, string[]> = {
  majors: ["ثلاجات", "غسالات", "بوتاجاز", "مراوح"],
  small: ["نظافة", "ميكروويف"],
  kitchen: ["خلاطات", "أواني"],
  clean: ["نظافة"],
  decor: ["أطقم سرير", "سجاد"],
};

/**
 * Bundles reference Supabase product IDs (`home-001` … `home-010`).
 * The bundlePrice is hand-tuned to be cheaper than the sum of items.
 * The orchestrator maps these to live `Product` rows on render.
 */
export const BUNDLES: Bundle[] = [
  {
    id: "b1",
    title: "حزمة المطبخ الذكي",
    desc: "خلاط + سيت أواني",
    itemIds: ["home-005", "home-008"],
    bundlePrice: 1890,
    badge: "وفّر 250 ج.م",
  },
  {
    id: "b2",
    title: "حزمة الطبخ السريع",
    desc: "ميكروويف + خلاط",
    itemIds: ["home-006", "home-005"],
    bundlePrice: 2499,
    badge: "وفّر 86 ج.م",
  },
  {
    id: "b3",
    title: "حزمة الراحة المنزلية",
    desc: "مكنسة + مروحة سقف",
    itemIds: ["home-004", "home-010"],
    bundlePrice: 8190,
    badge: "وفّر 130 ج.م",
  },
];

export const BESTSELLER_IDS: string[] = [
  "home-001",
  "home-002",
  "home-006",
  "home-008",
];

export const SORTS: { id: SortId; label: string }[] = [
  { id: "relevance", label: "الأنسب" },
  { id: "price-asc", label: "السعر: الأقل أولًا" },
  { id: "price-desc", label: "السعر: الأعلى أولًا" },
  { id: "rating", label: "الأعلى تقييمًا" },
  { id: "discount", label: "الأكثر خصمًا" },
];

/** Egyptian-pound formatter — Latin digits, "ج.م" suffix. */
export const fmt = (n: number): string =>
  `${toLatin(n.toLocaleString("en-US"))} ج.م`;
