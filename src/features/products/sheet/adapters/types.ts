import type { CartLineMeta } from "@/context/CartContext";

export interface AdapterResult {
  readonly qty: number;
  readonly unitPrice: number;
  readonly total: number;
  readonly meta?: CartLineMeta;
  /** When false, the parent CTA is disabled (e.g. mix not at 100%). */
  readonly disabled?: boolean;
  /** Human-readable reason for `disabled`. */
  readonly disabledReason?: string;
}
