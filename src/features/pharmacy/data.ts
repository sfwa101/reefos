/**
 * Pharmacy — UI dictionaries + Supabase-backed product feed.
 *
 * Phase 11.2: hardcoded `RX` products were removed. Categories,
 * idToLabel and the icon registry remain here as **UI configuration**
 * (not product data). Products are projected from the live Supabase
 * catalog via `useRxProducts()`.
 */
import {
  Sparkle,
  Leaf,
  Pill,
  HeartPulse,
  Activity,
  ShieldPlus,
  Baby,
} from "lucide-react";
import { useMemo } from "react";

import { useProductsBySourceQuery } from "@/hooks/useProductsQuery";
import type { Product } from "@/lib/products";

import type { CatId, Category, RxProduct } from "./types";

export const categories: Category[] = [
  { id: "all", name: "الكل", icon: Sparkle },
  { id: "vitamins", name: "فيتامينات ومكملات", icon: Leaf },
  { id: "rx", name: "أدوية موصوفة", icon: Pill },
  { id: "personal", name: "عناية شخصية متقدمة", icon: HeartPulse },
  { id: "diabetes", name: "عناية مرضى السكري", icon: Activity },
  { id: "firstaid", name: "الإسعافات الأولية", icon: ShieldPlus },
  { id: "baby", name: "عناية الأطفال", icon: Baby },
];

/**
 * Maps a UI CatId pill to the DB sub_category strings it includes.
 */
const CAT_TO_SUBCAT: Record<Exclude<CatId, "all">, string[]> = {
  vitamins: ["فيتامينات", "زيوت", "مكملات"],
  rx: ["صداع", "التهاب", "شراب"],
  personal: ["معقم", "نظافة"],
  diabetes: ["قياس", "أجهزة"],
  firstaid: ["ضماد", "إسعافات"],
  baby: ["جفاف", "أطفال"],
};

const subCatToCatId = (subCat: string | undefined): CatId => {
  if (!subCat) return "rx";
  for (const [cat, subs] of Object.entries(CAT_TO_SUBCAT)) {
    if (subs.includes(subCat)) return cat as CatId;
  }
  return "rx";
};

type RxMeta = {
  brand?: string;
  tagline?: string;
  badges?: string[];
  dosage?: string;
  reviews?: number;
};

const asRxMeta = (m: Product["metadata"]): RxMeta => {
  if (!m || typeof m !== "object") return {};
  const safe = m as Record<string, unknown>;
  const out: RxMeta = {};
  if (typeof safe.brand === "string") out.brand = safe.brand;
  if (typeof safe.tagline === "string") out.tagline = safe.tagline;
  if (Array.isArray(safe.badges))
    out.badges = safe.badges.filter((b): b is string => typeof b === "string");
  if (typeof safe.dosage === "string") out.dosage = safe.dosage;
  if (typeof safe.reviews === "number") out.reviews = safe.reviews;
  return out;
};

const productToRx = (p: Product): RxProduct => {
  const meta = asRxMeta(p.metadata);
  return {
    id: p.id,
    name: p.name,
    brand: meta.brand ?? p.brand ?? "Reef Pharmacy",
    unit: p.unit,
    price: p.price,
    oldPrice: p.oldPrice,
    image: p.image,
    rating: p.rating ?? 4.7,
    reviews: meta.reviews ?? 0,
    category: subCatToCatId(p.subCategory),
    tagline: meta.tagline ?? "",
    badges: meta.badges ?? [],
    dosage: meta.dosage ?? "—",
    inStock: true,
  };
};

/** Live Supabase-backed pharmacy catalog (replaces the old static RX). */
export const useRxProducts = (): { rx: RxProduct[]; rawProducts: Product[]; loading: boolean } => {
  const { data: rawProducts = [], isLoading } = useProductsBySourceQuery("pharmacy");
  const rx = useMemo(() => rawProducts.map(productToRx), [rawProducts]);
  return { rx, rawProducts, loading: isLoading };
};

export const idToLabel = (id: string): string =>
  ({
    "ai-symptoms": "تحليل الأعراض",
    "ai-schedule": "جدول الأدوية",
    "ai-consult": "استشارة الصيدلي",
    "ai-scan": "ماسح الأدوية",
  })[id] ?? id;
