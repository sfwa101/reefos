// Shared types & constants for the ProductEditor module.

export type ProductMetadataValue = string | number | boolean | null | readonly string[];
export type ProductMetadata = Record<string, ProductMetadataValue>;
export type ProductVariantRow = { id: string; label: string; priceDelta: number };
export type ProductAddonRow = { id: string; label: string; price: number };

export type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  price: number | string;
  old_price: number | string | null;
  cost_price: number | string | null;
  affiliate_commission_pct: number | string | null;
  image: string | null;
  image_url: string | null;
  image_path: string | null;
  rating: number | null;
  category: string;
  sub_category: string | null;
  source: string;
  badge: string | null;
  stock: number;
  sort_order: number;
  is_active: boolean;
  store_id: string | null;
  category_id: string | null;
  description: string | null;
  perishable: boolean | null;
  metadata?: ProductMetadata | null;
  variants?: ProductVariantRow[] | null;
  addons?: ProductAddonRow[] | null;
};

export const SOURCES = [
  { v: "supermarket", l: "سوبر ماركت" },
  { v: "kitchen", l: "مطبخ" },
  { v: "dairy", l: "ألبان" },
  { v: "produce", l: "خضار وفاكهة" },
  { v: "meat", l: "لحوم" },
  { v: "sweets", l: "حلويات" },
  { v: "pharmacy", l: "صيدلية" },
  { v: "library", l: "مكتبة" },
  { v: "wholesale", l: "جملة" },
  { v: "home", l: "أدوات منزلية" },
  { v: "village", l: "قرية" },
  { v: "baskets", l: "سلال" },
  { v: "restaurants", l: "مطاعم" },
  { v: "recipes", l: "وصفات" },
];

export const BADGES = [
  { v: "", l: "بدون" },
  { v: "best", l: "الأكثر مبيعاً" },
  { v: "trending", l: "رائج" },
  { v: "premium", l: "بريميوم" },
  { v: "new", l: "جديد" },
];

export const empty: ProductRow = {
  id: "",
  name: "",
  brand: "",
  unit: "قطعة",
  price: 0,
  old_price: null,
  cost_price: null,
  affiliate_commission_pct: 0,
  image: null,
  image_url: null,
  image_path: null,
  rating: null,
  category: "",
  sub_category: null,
  source: "supermarket",
  badge: null,
  stock: 100,
  sort_order: 0,
  is_active: true,
  store_id: null,
  category_id: null,
  description: null,
  perishable: null,
  metadata: {},
  variants: [],
  addons: [],
};

export type FieldDef =
  | { key: string; label: string; kind: "number"; placeholder?: string; suffix?: string }
  | { key: string; label: string; kind: "text"; placeholder?: string }
  | { key: string; label: string; kind: "bool" }
  | { key: string; label: string; kind: "select"; options: { v: string; l: string }[] };

export const META_SCHEMA: Record<string, FieldDef[]> = {
  recipes: [
    { key: "prep_minutes", label: "وقت التحضير", kind: "number", suffix: "دقيقة" },
    { key: "calories", label: "السعرات الحرارية", kind: "number", suffix: "kcal" },
    { key: "servings", label: "عدد الحصص", kind: "number" },
    { key: "spice_level", label: "درجة الحرارة", kind: "select", options: [
      { v: "mild", l: "خفيف" }, { v: "medium", l: "متوسط" }, { v: "hot", l: "حار" },
    ] },
  ],
  kitchen: [
    { key: "prep_minutes", label: "وقت التحضير", kind: "number", suffix: "دقيقة" },
    { key: "calories", label: "السعرات الحرارية", kind: "number", suffix: "kcal" },
    { key: "servings", label: "عدد الحصص", kind: "number" },
  ],
  restaurants: [
    { key: "prep_minutes", label: "وقت التحضير", kind: "number", suffix: "دقيقة" },
    { key: "calories", label: "السعرات الحرارية", kind: "number", suffix: "kcal" },
    { key: "spice_level", label: "درجة الحرارة", kind: "select", options: [
      { v: "mild", l: "خفيف" }, { v: "medium", l: "متوسط" }, { v: "hot", l: "حار" },
    ] },
  ],
  meat: [
    { key: "fat_pct", label: "نسبة الدهون", kind: "number", suffix: "%" },
    { key: "cut_type", label: "نوع القطعية", kind: "select", options: [
      { v: "fillet", l: "فيليه" }, { v: "ribeye", l: "ريب آي" },
      { v: "ground", l: "مفروم" }, { v: "shank", l: "موزة" },
      { v: "chops", l: "ريش" }, { v: "whole", l: "ذبيحة كاملة" },
    ] },
    { key: "origin", label: "المصدر", kind: "text", placeholder: "بلدي / مستورد" },
    { key: "preparation", label: "التجهيز", kind: "select", options: [
      { v: "whole", l: "كامل بدون تقطيع" },
      { v: "cut", l: "مقطّع قطع" },
      { v: "ground", l: "مفروم" },
      { v: "marinated", l: "متبّل جاهز للطهي" },
      { v: "skewers", l: "أسياخ" },
    ] },
    { key: "halal_certified", label: "ذبح حلال موثق", kind: "bool" },
  ],
  sweets: [
    { key: "allow_custom_name", label: "يسمح بكتابة اسم على التورتة", kind: "bool" },
    { key: "advance_hours", label: "وقت التجهيز المسبق", kind: "number", suffix: "ساعة" },
    { key: "calories", label: "السعرات الحرارية", kind: "number", suffix: "kcal" },
  ],
  pharmacy: [
    { key: "active_ingredient", label: "المادة الفعالة", kind: "text" },
    { key: "dosage", label: "الجرعة", kind: "text", placeholder: "500mg" },
    { key: "requires_prescription", label: "يتطلب وصفة طبية", kind: "bool" },
  ],
  produce: [
    { key: "origin", label: "بلد المنشأ", kind: "text" },
    { key: "organic", label: "عضوي", kind: "bool" },
  ],
  dairy: [
    { key: "fat_pct", label: "نسبة الدسم", kind: "number", suffix: "%" },
    { key: "lactose_free", label: "خالي من اللاكتوز", kind: "bool" },
  ],
  baskets: [
    { key: "items_count", label: "عدد العناصر داخل السلة", kind: "number" },
    { key: "subscription_friendly", label: "مناسب للاشتراك", kind: "bool" },
  ],
};
