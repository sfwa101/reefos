/**
 * Cognitive Pricing Runtime — Phase E-1
 * ----------------------------------------------------------------
 * Local draft shape for `public.salsabil_financial_contracts`.
 *
 * A financial contract = (asset + optional packaging tier + pricing model
 * + base price + currency + contract_rules JSONB Policy Graph).
 *
 * Persistence (DB writes) is deferred to Phase E-2. This module is shape-only.
 */

export type PricingModelKey =
  | "flat"
  | "tiered_wholesale"
  | "subscription"
  | "deposit_and_rental"
  | "milestone_installments";

export type CurrencyCode = "EGP" | "USD" | "EUR";

/** Conditions the Policy Graph can evaluate at pricing time. */
export type PolicyConditionKey =
  | "customer_group"
  | "cart_quantity"
  | "season"
  | "channel"
  | "loyalty_tier";

/** Operator the condition uses against its value. */
export type PolicyOperator = "eq" | "gte" | "lte" | "in";

/** Action applied when the condition matches. */
export type PolicyActionKey = "discount_percent" | "discount_amount" | "surcharge_percent" | "surcharge_amount";

export interface PricingPolicyRule {
  /** Local stable id (uuid) — never persisted as a DB row, lives inside contract_rules. */
  id: string;
  /** Human-friendly label (optional). */
  label?: string;
  condition: {
    key: PolicyConditionKey;
    op: PolicyOperator;
    value: string | number;
  };
  action: {
    key: PolicyActionKey;
    value: number;
  };
  is_active: boolean;
}

/** JSONB stored in salsabil_financial_contracts.contract_rules. */
export interface ContractRules {
  policies?: PricingPolicyRule[];
  [k: string]: unknown;
}

export interface FinancialContractDraft {
  /** Local id — used as React key. Server id is filled after persistence. */
  id: string;
  /** Optional link to a packaging tier (by local draft id or DB id). null = base asset. */
  packaging_tier_local_id: string | null;
  pricing_model: PricingModelKey;
  base_price: number;
  currency: CurrencyCode;
  contract_rules: ContractRules;
  is_active: boolean;
}
