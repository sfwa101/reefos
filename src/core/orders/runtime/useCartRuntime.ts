/**
 * Salsabil OS — Phase 1 · Wave 2
 * Layer 5 binding for the Sovereign CartRuntime.
 *
 * UI components dispatch intents through these stable callbacks. NEVER
 * perform pricing math here — read totals from `state.snapshot.totals`.
 */
import { useCallback, useEffect, useState } from "react";
import {
  cartRuntime as defaultRuntime,
  type CartRuntime,
  type CartRuntimeState,
  type AddCartItemIntent,
} from "./CartRuntime";
import type { CashierContext } from "@/core/cashier/domain/types";

export interface UseCartRuntime {
  readonly state: CartRuntimeState;
  readonly add: (intent: AddCartItemIntent) => void;
  readonly remove: (lineId: string) => void;
  readonly setQty: (lineId: string, qty: number) => void;
  readonly clear: () => void;
  readonly setContext: (context: CashierContext) => void;
}

export function useCartRuntime(runtime: CartRuntime = defaultRuntime): UseCartRuntime {
  const [state, setState] = useState<CartRuntimeState>(() => runtime.getState());
  useEffect(() => runtime.subscribe(setState), [runtime]);
  const add = useCallback(
    (intent: AddCartItemIntent) => {
      runtime.add(intent);
    },
    [runtime],
  );
  const remove = useCallback(
    (lineId: string) => {
      runtime.remove(lineId);
    },
    [runtime],
  );
  const setQty = useCallback(
    (lineId: string, qty: number) => {
      runtime.setQty(lineId, qty);
    },
    [runtime],
  );
  const clear = useCallback(() => {
    runtime.clear();
  }, [runtime]);
  const setContext = useCallback(
    (context: CashierContext) => {
      runtime.setContext(context);
    },
    [runtime],
  );
  return { state, add, remove, setQty, clear, setContext };
}
