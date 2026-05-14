// Strict Marketing Hub types — replaces every unsafe escape usage in the legacy file.
// Keep this file the SOLE source of truth for the three Marketing panels.

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  placement: string;
  link_url: string | null;
  category_slug: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export type BannerForm = Omit<Banner, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_pct: number;
  discount_amount: number | null;
  min_order_total: number | null;
  min_user_level: Tier;
  per_user_limit: number;
  max_uses: number | null;
  uses_count: number | null;
  ends_at: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export type CouponDiscountType = "pct" | "amount";

export interface CouponForm {
  id?: string;
  code: string;
  description: string | null;
  discount_pct: number | string;
  discount_amount: number | string | null;
  min_order_total: number | string | null;
  min_user_level: Tier;
  per_user_limit: number | string;
  max_uses: number | string | null;
  ends_at: string;
  is_active: boolean;
  type: CouponDiscountType;
}

export interface FlashSale {
  id: string;
  ends_at: string;
  starts_at?: string | null;
  is_active: boolean;
  cycle_label: string | null;
}

export interface FlashSaleProduct {
  id: string;
  flash_sale_id: string;
  product_id: string;
  product_name: string | null;
  category: string | null;
  original_price: number;
  discount_pct: number;
  reason: string | null;
  rank: number;
}

export interface FlashProductForm {
  id?: string;
  product_id: string;
  product_name: string;
  category: string;
  original_price: number | string;
  discount_pct: number | string;
  reason: string;
  rank: number | string;
}

export const PLACEMENTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "hero", label: "الواجهة الرئيسية" },
  { value: "category_middle", label: "وسط الأقسام" },
  { value: "cart_top", label: "أعلى السلة" },
  { value: "home_strip", label: "شريط الصفحة" },
];

export const TIERS: ReadonlyArray<Tier> = ["bronze", "silver", "gold", "platinum"];
