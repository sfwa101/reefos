/**
 * Cashier Brain — Client Hooks (Layer 3 binding)
 * Constitution v2.0 · Article 12.1
 *
 * Thin React Query binding around the audited Cashier gateway. UI must
 * NOT call the legacy `useCartCalculations` math directly when consuming
 * the Cashier Brain — go through this hook so every preview is observable.
 */
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { previewCashierFn } from "./cashier.functions";
import type { CartSnapshot } from "../domain/types";

export interface CashierPreviewItem {
  readonly id: string;
  readonly qty: number;
  readonly modifiers?: ReadonlyArray<{
    readonly id: string;
    readonly label?: string;
    readonly unit_price_delta: number;
  }>;
}

export interface CashierPreviewInput {
  readonly items: ReadonlyArray<CashierPreviewItem>;
  readonly context: {
    readonly member_tier: "guest" | "bronze" | "silver" | "gold" | "vip";
    readonly coupon_code?: string | null;
    readonly delivery_zone_id?: string | null;
    readonly delivery_fee?: number;
    readonly currency?: string;
  };
}

/**
 * Mutation-style preview. Callers fire-and-forget on cart change for
 * shadow observation; future cutover will switch to a query keyed on a
 * stable cart fingerprint.
 */
export function useCashierPreview() {
  const fn = useServerFn(previewCashierFn);
  return useMutation<CartSnapshot, Error, CashierPreviewInput>({
    mutationFn: async (input) =>
      fn({
        data: {
          items: input.items.map((i) => ({
            id: i.id,
            qty: i.qty,
            modifiers: i.modifiers?.map((m) => ({
              id: m.id,
              label: m.label,
              unit_price_delta: m.unit_price_delta,
            })),
          })),
          context: { ...input.context },
        },
      }),
  });
}
