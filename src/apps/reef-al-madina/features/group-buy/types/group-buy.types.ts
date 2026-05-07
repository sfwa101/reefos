export type GroupBuyStatus = "gathering" | "succeeded" | "failed" | "fulfilled";
export type GroupBuyPledgeStatus = "locked" | "committed" | "refunded";

export interface GroupBuyCampaign {
  id: string;
  product_id: string | null;
  vendor_id: string | null;
  geo_zone_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  target_quantity: number;
  current_quantity: number;
  status: GroupBuyStatus;
  expires_at: string;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBuyTier {
  id: string;
  campaign_id: string;
  quantity_threshold: number;
  price_per_unit: number;
}

export interface GroupBuyPledge {
  id: string;
  campaign_id: string;
  user_id: string;
  pledged_quantity: number;
  unit_price_locked: number;
  escrow_amount: number;
  escrow_wallet_tx_id: string | null;
  status: GroupBuyPledgeStatus;
  settled_at: string | null;
  created_at: string;
}

export interface ResolvedTierState {
  currentTier: GroupBuyTier | null;
  nextTier: GroupBuyTier | null;
  currentPrice: number;
  unitsToNextDrop: number;
  progressPct: number;
}
