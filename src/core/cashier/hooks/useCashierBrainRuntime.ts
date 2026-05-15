/**
 * Salsabil OS — Phase 1 · Wave 1
 * Layer 3 binding for the Cashier Brain runtime.
 *
 * Responsibilities (read-only here — mutations live in usePosEngine):
 *   • Resolve the active POS shift via the audited POSGateway.
 *   • Resolve the workspace section's active capabilities.
 *   • Compute the active POSMode purely via {@link CashierBrain.resolveMode}.
 */
import { useEffect, useMemo, useState } from "react";
import { CashierBrain } from "../domain/CashierBrain";
import {
  type POSCapabilityView,
  type POSMode,
} from "../domain/POSMode";
import { POSGateway } from "../gateway/POSGateway";
import type { CapabilityKey } from "@/core/capabilities/CapabilityRegistry";
import type { PosShift } from "@/core/contracts/pos";

export interface CashierBrainRuntime {
  readonly shift: PosShift | null;
  readonly shiftLoading: boolean;
  readonly shiftError: string | null;
  readonly capabilities: POSCapabilityView;
  readonly mode: POSMode;
}

export interface CashierBrainRuntimeOptions {
  /** Authenticated cashier user id. */
  readonly cashierId: string | null | undefined;
  /** Capability keys assigned to the workspace section/terminal. */
  readonly sectionCapabilities: ReadonlyArray<CapabilityKey>;
}

const adaptShift = (row: Awaited<
  ReturnType<typeof POSGateway.fetchOpenShiftForCashier>
>["shift"]): PosShift | null => {
  if (!row) return null;
  return {
    id: row.id,
    branch_id: row.branch_id,
    cashier_id: row.cashier_id,
    status: row.status === "closed" ? "closed" : "open",
    opening_balance: row.opening_balance,
    closing_balance: null,
    expected_balance: null,
    discrepancy: null,
    total_sales: row.total_sales,
    total_orders: row.total_orders,
    notes: null,
    opened_at: row.opened_at,
    closed_at: null,
  };
};

export function useCashierBrainRuntime(
  opts: CashierBrainRuntimeOptions,
): CashierBrainRuntime {
  const { cashierId, sectionCapabilities } = opts;
  const [shift, setShift] = useState<PosShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState<boolean>(true);
  const [shiftError, setShiftError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!cashierId) {
      setShift(null);
      setShiftLoading(false);
      setShiftError(null);
      return () => {
        cancelled = true;
      };
    }
    setShiftLoading(true);
    POSGateway.fetchOpenShiftForCashier(cashierId)
      .then(({ shift: row, error }) => {
        if (cancelled) return;
        setShift(adaptShift(row));
        setShiftError(error);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShift(null);
        setShiftError(err instanceof Error ? err.message : "shift_fetch_failed");
      })
      .finally(() => {
        if (!cancelled) setShiftLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cashierId]);

  const capabilities = useMemo<POSCapabilityView>(
    () => CashierBrain.capabilityView(sectionCapabilities),
    [sectionCapabilities],
  );
  const mode = useMemo<POSMode>(
    () => CashierBrain.resolveMode(sectionCapabilities),
    [sectionCapabilities],
  );

  return { shift, shiftLoading, shiftError, capabilities, mode };
}
