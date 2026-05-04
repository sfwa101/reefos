/**
 * Shared (isomorphic) catalog seed contract.
 *
 * Pure constants + types — safe to import from BOTH the browser
 * (admin Catalog Backup page) and the Node CLI script
 * (scripts/db-backup/sync-seed.ts). No Node-only built-ins here.
 */

// ─── HARD-CODED ALLOWLIST (single source of truth) ──────────────────────
export const CATALOG_TABLES = [
  "categories",
  "products",
  "loyalty_tier_rules",
  "incentive_milestones",
] as const;
export type CatalogTable = (typeof CATALOG_TABLES)[number];

// Natural primary keys used for UPSERT conflict resolution
export const PK: Record<CatalogTable, string> = {
  categories: "id",
  products: "id",
  loyalty_tier_rules: "tier",
  incentive_milestones: "key",
};

// Defense-in-depth informational blocklist
export const FORBIDDEN_TABLES = [
  "profiles", "orders", "order_items", "cart_items", "carts",
  "wallet_transactions", "wallet_balances", "addresses", "user_roles",
  "audit_logs", "payments", "invoices", "referral_codes",
  "messages", "notifications",
] as const;

export type SeedRow = Record<string, unknown>;

export type SeedFile = {
  $schema: string;
  version: 1;
  exported_at: string | null;
  exported_by: string | null;
  note: string;
  tables: Record<CatalogTable, SeedRow[]>;
};
