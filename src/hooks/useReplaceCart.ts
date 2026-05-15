/**
 * useReplaceCart — 1-tap "swap my cart" action.
 *
 * Wraps the underlying Zustand `replaceAll(lines)` so callers can pass an
 * array of {product, qty[, meta]} and get a debounced remote-sync push +
 * a unified success toast. Used by the Hakim Predictive Basket and any
 * future "apply this saved basket" surfaces.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { useCartActions } from "@/core/orders/runtime/projection";
import type { CartLine } from "@/core/orders/runtime/types";

export type ReplaceCartLine = CartLine;

export function useReplaceCart() {
  const { replaceAll } = useCartActions();

  return useCallback(
    (lines: ReplaceCartLine[], opts?: { silent?: boolean; message?: string }) => {
      replaceAll(lines);
      if (!opts?.silent) {
        toast.success(opts?.message ?? "تم استبدال السلة بنجاح");
      }
    },
    [replaceAll],
  );
}
