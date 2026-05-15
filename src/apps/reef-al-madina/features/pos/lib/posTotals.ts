/**
 * Salsabil OS — Wave P-1.4 · POS Line Total Helpers.
 *
 * Single canonical resolver for POS cart math. The POS surface uses a
 * lightweight `PosCartLine` shape (not the standard `CartLine`), so it
 * cannot consume `lineGrandTotal` directly — but the multiplication is
 * still sealed inside the engine layer here, never inlined in `.tsx`.
 */
import type { PosCartLine } from "../types/pos.types";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Canonical line total for a single POS cart line (price × qty). */
export function posLineTotal(line: PosCartLine): number {
  const p = Number.isFinite(line.price) ? Math.max(0, line.price) : 0;
  const q = Number.isFinite(line.qty) ? Math.max(0, line.qty) : 0;
  return round2(p * q);
}

/** Canonical cart subtotal across all POS lines. */
export function posCartSubtotal(lines: ReadonlyArray<PosCartLine>): number {
  let t = 0;
  for (const l of lines) t += posLineTotal(l);
  return round2(t);
}
