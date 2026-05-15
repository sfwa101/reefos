/**
 * Salsabil OS — Wave P-1.4 · Historical Line Total Resolver.
 *
 * Layer 4 (Domain). Single canonical helper for ALREADY-PLACED order rows
 * (admin/vendor read-models) where the database stores `price_at_time` but
 * not a pre-computed line total. Multiplication happens HERE — never in any
 * React render path (Law 3 — Presentation Purity).
 *
 * For LIVE carts use `lineGrandTotal` from `@/core/orders/runtime/lineTotals`.
 */
export interface HistoricalLineRow {
  readonly price: number;
  readonly quantity: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Compute the canonical line total for a historical/persisted order row. */
export function historicalLineTotal(row: HistoricalLineRow): number {
  const p = Number.isFinite(row.price) ? Math.max(0, row.price) : 0;
  const q = Number.isFinite(row.quantity) ? Math.max(0, row.quantity) : 0;
  return round2(p * q);
}

/** Sum the canonical line totals across an array of historical rows. */
export function sumHistoricalLineTotals(
  rows: ReadonlyArray<HistoricalLineRow>,
): number {
  let t = 0;
  for (const r of rows) t += historicalLineTotal(r);
  return round2(t);
}
