export type RailType =
  | "flash_sale"
  | "bundle"
  | "personalized"
  | "category"
  | "restaurant"
  | "sponsored";

export type StorefrontRail = {
  id: string;
  type: RailType;
  title: string;
  subtitle: string | null;
  target_id: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
