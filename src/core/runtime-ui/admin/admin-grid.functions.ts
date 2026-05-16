// Admin Grid Gateway — Wave R-2 · Batch A.
// Generic, allowlisted server function powering the `UniversalAdminGrid`.
// Replaces the direct `supabase.from(...).select(...).range(...)` calls that
// previously lived inside the presentational component (Article 3a violation).
//
// Security model:
//   1. `requireAdmin` middleware enforces an authenticated admin session.
//   2. The `table` parameter is validated against `ADMIN_GRID_ALLOWED_TABLES`
//      (defined inline below). Unknown tables are rejected.
//   3. The `select` clause is validated against a strict regex that allows
//      identifiers, commas, parens, asterisks and the inner-select operators
//      Supabase already understands. Anything else is rejected.
//   4. The `searchKeys` are validated as identifiers as well, so the synthesized
//      `or(...ilike...)` filter cannot be used to inject arbitrary SQL fragments.
//
// Tenant isolation continues to rely on RLS, identical to the previous
// behaviour. This file only moves the I/O boundary.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

// ---- Allowlist ------------------------------------------------------------
// Keep this list in sync with `dataSource.table` usages in admin pages.
const ADMIN_GRID_ALLOWED_TABLES = new Set<string>([
  "audit_logs",
  "cashier_sessions",
  "commission_ledger",
  "cross_branch_transfers",
  "delivery_tasks",
  "discount_overrides",
  "driver_cash_settlements",
  "drivers",
  "flash_sale_products",
  "hakim_anomalies",
  "hakim_insights",
  "inventory_locations",
  "kyc_verifications",
  "notifications",
  "orders",
  "partner_ledgers",
  "print_jobs",
  "product_batches",
  "referrals",
  "reviews",
  "salsabil_assets",
  "salsabil_master_orders",
  "savings_jar",
  "staff_advance_requests",
  "staff_attendance",
  "store_settlements",
  "support_tickets",
  "user_payout_requests",
  "user_roles",
  "vendor_payout_requests",
  "wallet_topup_requests",
  "zone_availability",
  "salsabil_event_timeline",
]);

// Identifiers used in `searchKeys` and `orderBy.column`.
const IDENT_RE = /^[a-z_][a-z0-9_]{0,63}$/i;
// Restrictive whitelist for `select` strings. Allows the subset of PostgREST
// select syntax actually used by admin grids.
const SELECT_RE = /^[\w\s,*().!:=->\[\]]+$/;

// ---- I/O types ------------------------------------------------------------
export type AdminGridQuery = {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  /** zero-based offset */
  offset: number;
  /** page size (1-200) */
  limit: number;
  /** debounced user query, optional */
  search?: string | null;
  /** ilike search columns, must be identifiers */
  searchKeys?: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminGridPage<T = any> = {
  items: T[];
  hasMore: boolean;
};

const escapeIlike = (raw: string): string => raw.replace(/[%,()]/g, (m) => `\\${m}`);

function validate(input: AdminGridQuery): AdminGridQuery {
  const table = String(input.table ?? "").trim();
  if (!ADMIN_GRID_ALLOWED_TABLES.has(table)) {
    throw new Error(`admin_grid_table_not_allowed:${table}`);
  }

  const select = String(input.select ?? "*").trim();
  if (!SELECT_RE.test(select)) throw new Error("admin_grid_invalid_select");

  const offset = Math.max(0, Math.floor(Number(input.offset) || 0));
  const limitRaw = Math.floor(Number(input.limit) || 50);
  const limit = Math.max(1, Math.min(200, limitRaw));

  const orderBy = input.orderBy
    ? {
        column: String(input.orderBy.column ?? "").trim(),
        ascending: !!input.orderBy.ascending,
      }
    : undefined;
  if (orderBy && !IDENT_RE.test(orderBy.column)) {
    throw new Error("admin_grid_invalid_order_column");
  }

  const searchKeys = Array.isArray(input.searchKeys)
    ? input.searchKeys.map((k) => String(k).trim()).filter(Boolean)
    : [];
  for (const k of searchKeys) {
    if (!IDENT_RE.test(k)) throw new Error(`admin_grid_invalid_search_key:${k}`);
  }

  const search = input.search ? String(input.search).trim().slice(0, 200) : null;

  return { table, select, offset, limit, orderBy, searchKeys, search };
}

// ---- Handler --------------------------------------------------------------
export const listAdminGridFn = createServerFn({ method: "POST" })
  .inputValidator((d: AdminGridQuery) => validate(d))
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<AdminGridPage> => {
    const sb = context.supabase as SbAny;

    let query = sb
      .from(data.table)
      .select(data.select ?? "*")
      .range(data.offset, data.offset + data.limit - 1);

    if (data.orderBy) {
      query = query.order(data.orderBy.column, { ascending: data.orderBy.ascending });
    }

    if (data.search && data.searchKeys && data.searchKeys.length > 0) {
      const safe = escapeIlike(data.search);
      const orExpr = data.searchKeys.map((k) => `${k}.ilike.%${safe}%`).join(",");
      query = query.or(orExpr);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const items = (rows ?? []) as Array<Record<string, unknown>>;
    return {
      items,
      hasMore: items.length >= data.limit,
    };
  });
