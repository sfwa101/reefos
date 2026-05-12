/**
 * Wave 2.A — Catalog Domain View Models.
 *
 * هذه الأنواع هي العقد الوحيد بين طبقة البيانات (Postgres) والواجهات (React).
 * الواجهات تتعامل معها فقط — لا تعرف شيئاً عن أعمدة الجداول أو jsonb.
 *
 * تغيير قاعدة البيانات لاحقاً (مثلاً نقل nutrition لخدمة منفصلة) لن يكسر
 * أي مكوّن، فقط Transformers تحتاج تحديث.
 *
 * Constitution v2.0 lineage:
 *   ProductCardVM / ProductDetailsVM are the Layer-5 (Presentation) projection
 *   of the Layer-4 ProductDNA layers (`identity` + `financial` + slices of
 *   `behavioral` and `supply`). They remain structurally independent to keep
 *   the storefront UI 100% non-breaking.
 */

import type {
  ProductIdentityDNA,
  ProductFinancialDNA,
} from "@/core/dna/types";

export type LocaleCode = "ar" | "en";
export type CurrencyCode = "EGP" | "USD" | "EUR";

/** قيمة JSON قابلة للـ serialization عبر server function boundary. */
export type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [k: string]: JsonValue };
/** قيمة مترجمة — تعرض حسب لغة المستخدم في runtime. */
export interface I18nText {
  ar: string;
  en?: string;
}

/** رابط صورة بكامل metadata الـ pipeline (responsive, blur). */
export interface MediaRefVM {
  url: string;
  alt: I18nText;
  width?: number;
  height?: number;
  blurhash?: string;
  /** kind: hero | gallery | thumbnail | nutrition_label | ... */
  kind: string;
}

export interface PriceVM {
  amount: number;
  currency: CurrencyCode;
  /** السعر قبل الخصم — undefined إذا لا يوجد خصم. */
  compareAt?: number;
  /** نسبة الخصم 0..1 (مشتقّة، لا تأتي من DB). */
  discountRatio?: number;
  /** هل هذا السعر "للأعضاء" / wholesale؟ */
  tier?: "base" | "member" | "wholesale";
}

export interface BadgeVM {
  /** مفتاح ثابت من registry — لا hardcoded labels في UI. */
  key: string;
  /** label مترجم إذا توفّر. */
  label?: I18nText;
  tone?: "info" | "success" | "warning" | "destructive" | "primary";
}

export interface ProductVariantVM {
  id: string;
  axisKey: string;        // مثل "size" / "weight" / "color"
  axisValue: string;      // قيمة منطقية
  axisValueLabel: I18nText;
  priceDelta: number;
  isDefault: boolean;
  isActive: boolean;
  inStock: boolean;
  imageUrl?: string;
  sortOrder: number;
}

export interface ProductAddonVM {
  id: string;
  groupKey: string;
  groupLabel: I18nText;
  label: I18nText;
  kind: string;           // free-form (sauce | bag | wrapping | …) — يدفعه القسم
  priceDelta: number;
  isRequired: boolean;
  maxQty: number;
  sortOrder: number;
}

export interface ProductNutritionVM {
  per100g: Record<string, number>;     // مثلاً { kcal: 250, protein_g: 12, ... }
  perServing?: Record<string, number>;
  servingSizeG?: number;
  allergens: string[];
  dietFlags: Record<string, boolean>;  // مثلاً { halal: true, keto: true, gluten_free: false }
  ingredients?: I18nText;
}

export interface ProductRelationVM {
  relatedId: string;
  relationType: string;  // manual | similar | bought_together | complementary | seasonal
  strength: number;      // 0..1
}

/** Card view — list/grid contexts. أصغر شكل قابل للعرض. */
export interface ProductCardVM {
  id: string;
  slug: string;
  sku?: string;
  sectionId: string;
  sectionSlug: string;
  name: I18nText;
  shortDescription?: I18nText;
  hero?: MediaRefVM;
  price: PriceVM;
  saleUnit: string;
  inStock: boolean;
  isLowStock: boolean;
  badges: BadgeVM[];
  tags: string[];
  rating: { avg: number; count: number };
  /** قدرات مفعّلة على هذا المنتج (مشتقّة من القسم + الـ attributes). Array للسماح بالـ serialization. */
  capabilities: readonly string[];
  /** سياق إضافي يحتاجه القسم لتقديم Card مخصّص (jsonb من attributes). */
  attributes: Readonly<Record<string, JsonValue>>;
}

/** Details view — صفحة منتج كاملة. */
export interface ProductDetailsVM extends ProductCardVM {
  description?: I18nText;
  story?: I18nText;
  storageConditions?: I18nText;
  shelfLifeDays?: number;
  isPerishable: boolean;
  gallery: MediaRefVM[];
  variants: ProductVariantVM[];
  addons: ProductAddonVM[];
  nutrition?: ProductNutritionVM;
  relations: ProductRelationVM[];
  seasonalWindow?: { startsAt: string; endsAt: string };
}

/** صفحة قائمة — page + cursor. */
export interface ProductListVM {
  items: ProductCardVM[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Type-level lineage marker: documents which DNA layers each VM field
 * conceptually derives from. Compile-only; no runtime cost. Keeps the
 * `ProductIdentityDNA` / `ProductFinancialDNA` imports anchored so the
 * relationship is enforced by tsc going forward.
 */
export type _ProductVMLineage = {
  identity: Pick<
    ProductIdentityDNA,
    "id" | "slug" | "sku" | "section_id" | "tags" | "badges" | "is_active"
  >;
  financial: Pick<
    ProductFinancialDNA,
    "currency" | "base_price" | "compare_at_price"
  >;
};
