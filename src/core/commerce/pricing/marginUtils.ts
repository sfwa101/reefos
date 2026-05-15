/**
 * Salsabil OS — Wave P-1.4 · Margin Math Utilities.
 *
 * Layer 4 (Domain). Inverse-margin pricing helpers used by admin
 * cost-management screens. UI MUST NOT inline these formulas
 * (Law 3 — Presentation Purity).
 */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Derive the implied cost price from a retail price and a target gross
 * margin percentage. `marginPct` is clamped to [0, 100]; values outside
 * the band are coerced rather than thrown so the admin UI can drive
 * `applyMargin(50)` etc. without defensive guards.
 */
export function costFromMarginPct(price: number, marginPct: number): number {
  const safePrice = Number.isFinite(price) ? Math.max(0, price) : 0;
  const safeMargin = Number.isFinite(marginPct)
    ? Math.min(100, Math.max(0, marginPct))
    : 0;
  return round2(safePrice * (1 - safeMargin / 100));
}
