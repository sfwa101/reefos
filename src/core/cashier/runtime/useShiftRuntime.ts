/**
 * Salsabil OS — Phase 1 · Wave 6
 * Layer 5 binding for the ShiftRuntime.
 */
import { useCallback, useEffect, useState } from "react";
import {
  shiftRuntime as defaultRuntime,
  type ShiftRuntime,
  type ShiftSnapshot,
  type OpenShiftIntent,
  type CloseShiftIntent,
  type ShiftSettlementResult,
} from "./ShiftRuntime";

export interface UseShiftRuntime {
  readonly snapshot: ShiftSnapshot;
  readonly openShift: (intent: OpenShiftIntent) => ShiftSnapshot;
  readonly closeShift: (intent: CloseShiftIntent) => ShiftSettlementResult;
}

export function useShiftRuntime(runtime: ShiftRuntime = defaultRuntime): UseShiftRuntime {
  const [snapshot, setSnapshot] = useState<ShiftSnapshot>(() => runtime.getSnapshot());
  useEffect(() => runtime.subscribe(setSnapshot), [runtime]);
  const openShift = useCallback(
    (intent: OpenShiftIntent) => runtime.openShift(intent),
    [runtime],
  );
  const closeShift = useCallback(
    (intent: CloseShiftIntent) => runtime.closeShift(intent),
    [runtime],
  );
  return { snapshot, openShift, closeShift };
}
