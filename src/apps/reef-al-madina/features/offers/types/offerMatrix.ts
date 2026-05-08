/**
 * Phase 21 — Spatio-Temporal Offers Matrix types.
 * Mirror of the `offers_matrix` table (typed bridge until generated types refresh).
 */
export type TemporalContext = {
  start_hour?: number; // 0-23 local
  end_hour?: number; // 0-23 local
  weekdays?: number[]; // 0-6 (Sun=0)
  season_tags?: string[];
  starts_at?: string | null;
  ends_at?: string | null;
};

export type GeoContext = {
  governorate_codes?: string[];
  proximity_boost_km?: number;
  zone_ids?: string[];
};

export type PersonaContext = {
  required_tier?: "bronze" | "silver" | "gold" | "platinum" | null;
  gender_lock?: "male" | "female" | null;
  kyc_only?: boolean;
  min_amanah_score?: number;
};

export type LogicWeaverRule = {
  if: string;
  then: "boost" | "filter" | "hide";
  weight?: number;
};

export type OfferBlockType =
  | "flash_sale"
  | "bundle"
  | "personalized"
  | "category"
  | "restaurant"
  | "sponsored"
  | "tier_exclusive";

export type OfferMatrixRow = {
  id: string;
  title: string;
  subtitle: string | null;
  block_type: OfferBlockType;
  target_id: string | null;
  priority: number;
  is_active: boolean;
  temporal_context: TemporalContext;
  geo_context: GeoContext;
  persona_context: PersonaContext;
  logic_weaver_rules: LogicWeaverRule[];
  honest_margin_pct: number | null;
  allow_fakka_roundup: boolean;
  created_at: string;
  updated_at: string;
};

export type UserContext = {
  gender: "male" | "female" | null;
  isKycVerified: boolean;
  tier: "bronze" | "silver" | "gold" | "platinum";
  governorate: string | null;
  amanahScore: number;
  now: Date;
};
