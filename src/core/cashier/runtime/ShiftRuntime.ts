/**
 * Salsabil OS — Phase 1 · Wave 6
 * Layer 4 (Domain) · ShiftRuntime — Sovereign Shift Settlement.
 *
 * Owns the lifecycle of a POS shift (open → operate → close). Settlement
 * math is derived strictly from the immutable LedgerGateway aggregation;
 * the UI is forbidden from computing the expected drawer total.
 *
 * Constitutional invariants:
 *   - Variances are NEVER fixed via UPDATE/DELETE. They are appended as
 *     compensating ledger entries with deterministic idempotency keys.
 *   - Every shift transition emits a sovereign event (`pos.shift.opened`,
 *     `pos.shift.closed`, and `ledger.variance.recorded` when applicable).
 */
import {
  ledgerGateway as defaultLedger,
  type LedgerGateway,
  type LedgerTransaction,
} from "@/core/finance/gateway/LedgerGateway";
import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

export type ShiftStatus = "idle" | "open" | "closed";

export interface OpenShiftIntent {
  readonly startingCash: number;
  readonly currency?: string;
  readonly cashierId?: string;
}

export interface CloseShiftIntent {
  readonly actualCash: number;
  readonly notes?: string;
}

export interface ShiftSnapshot {
  readonly status: ShiftStatus;
  readonly shiftId: string | null;
  readonly currency: string;
  readonly startingCash: number;
  readonly openedAt: number | null;
  readonly closedAt: number | null;
  readonly cashierId: string | null;
  readonly lastSettlement: ShiftSettlementResult | null;
}

export interface ShiftSettlementResult {
  readonly shiftId: string;
  readonly startingCash: number;
  readonly expectedCash: number;
  readonly actualCash: number;
  readonly variance: number;
  readonly currency: string;
  readonly closedAt: number;
  readonly varianceTransaction: LedgerTransaction | null;
}

export type ShiftRuntimeListener = (snapshot: ShiftSnapshot) => void;

export interface ShiftRuntimeOptions {
  readonly ledger?: LedgerGateway;
  readonly clock?: () => number;
  readonly idGenerator?: () => string;
  readonly defaultCurrency?: string;
  readonly varianceAccount?: string;
  readonly appId?: SalsabilAppId;
}

const EMPTY: ShiftSnapshot = {
  status: "idle",
  shiftId: null,
  currency: "USD",
  startingCash: 0,
  openedAt: null,
  closedAt: null,
  cashierId: null,
  lastSettlement: null,
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const safeUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `shf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export class ShiftRuntime {
  private snapshot: ShiftSnapshot;
  private readonly listeners = new Set<ShiftRuntimeListener>();
  private readonly ledger: LedgerGateway;
  private readonly clock: () => number;
  private readonly idGen: () => string;
  private readonly defaultCurrency: string;
  private readonly varianceAccount: string;
  private readonly appId?: SalsabilAppId;

  constructor(opts?: ShiftRuntimeOptions) {
    this.ledger = opts?.ledger ?? defaultLedger;
    this.clock = opts?.clock ?? (() => Date.now());
    this.idGen = opts?.idGenerator ?? safeUuid;
    this.defaultCurrency = opts?.defaultCurrency ?? "USD";
    this.varianceAccount = opts?.varianceAccount ?? "cash.drawer.variance";
    this.appId = opts?.appId;
    this.snapshot = { ...EMPTY, currency: this.defaultCurrency };
  }

  getSnapshot(): ShiftSnapshot {
    return this.snapshot;
  }

  subscribe(listener: ShiftRuntimeListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  openShift(intent: OpenShiftIntent): ShiftSnapshot {
    if (this.snapshot.status === "open") {
      throw new Error("ShiftRuntime.openShift: a shift is already open");
    }
    if (!Number.isFinite(intent.startingCash) || intent.startingCash < 0) {
      throw new Error("ShiftRuntime.openShift: startingCash must be a non-negative finite number");
    }
    const shiftId = this.idGen();
    const openedAt = this.clock();
    const currency = intent.currency ?? this.defaultCurrency;
    const startingCash = round2(intent.startingCash);
    const next: ShiftSnapshot = {
      status: "open",
      shiftId,
      currency,
      startingCash,
      openedAt,
      closedAt: null,
      cashierId: intent.cashierId ?? null,
      lastSettlement: null,
    };
    this.commit(next);
    emitSalsabilEvent("pos.shift.opened", {
      shiftId,
      openedAt,
      startingCash,
      currency,
      cashierId: intent.cashierId,
      appId: this.appId,
    });
    return next;
  }

  /**
   * Close the current shift. The expected drawer total is derived
   * purely by aggregating the immutable ledger log for this shift.
   * Any non-zero variance is appended to the ledger as a compensating
   * entry with a deterministic idempotency key.
   */
  closeShift(intent: CloseShiftIntent): ShiftSettlementResult {
    if (this.snapshot.status !== "open" || !this.snapshot.shiftId) {
      throw new Error("ShiftRuntime.closeShift: no shift is currently open");
    }
    if (!Number.isFinite(intent.actualCash) || intent.actualCash < 0) {
      throw new Error("ShiftRuntime.closeShift: actualCash must be a non-negative finite number");
    }
    const shiftId = this.snapshot.shiftId;
    const currency = this.snapshot.currency;
    const startingCash = this.snapshot.startingCash;

    const aggregation = this.ledger.aggregateShift(shiftId, currency);
    const expectedCash = round2(startingCash + aggregation.net);
    const actualCash = round2(intent.actualCash);
    const variance = round2(actualCash - expectedCash);
    const closedAt = this.clock();

    let varianceTx: LedgerTransaction | null = null;
    if (variance !== 0) {
      const direction: "debit" | "credit" = variance > 0 ? "credit" : "debit";
      varianceTx = this.ledger.appendEvent({
        idempotency_key: `shift_variance:${shiftId}`,
        order_id: `shift:${shiftId}`,
        account: this.varianceAccount,
        amount: Math.abs(variance),
        currency,
        direction,
        shift_id: shiftId,
        memo: intent.notes ?? "Shift settlement variance",
      });
      emitSalsabilEvent("ledger.variance.recorded", {
        transactionId: varianceTx.transaction_id,
        idempotencyKey: varianceTx.idempotency_key,
        shiftId,
        expected: expectedCash,
        actual: actualCash,
        variance,
        direction,
        currency,
        appId: this.appId,
      });
    }

    const settlement: ShiftSettlementResult = {
      shiftId,
      startingCash,
      expectedCash,
      actualCash,
      variance,
      currency,
      closedAt,
      varianceTransaction: varianceTx,
    };

    const next: ShiftSnapshot = {
      ...this.snapshot,
      status: "closed",
      closedAt,
      lastSettlement: settlement,
    };
    this.commit(next);

    emitSalsabilEvent("pos.shift.closed", {
      shiftId,
      closedAt,
      startingCash,
      expectedCash,
      actualCash,
      variance,
      currency,
      notes: intent.notes,
      cashierId: this.snapshot.cashierId ?? undefined,
      appId: this.appId,
    });

    return settlement;
  }

  /** Return the runtime to the idle state (e.g. starting a fresh session). */
  reset(): void {
    this.commit({ ...EMPTY, currency: this.defaultCurrency });
  }

  private commit(next: ShiftSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener(next);
  }
}

/** Process-singleton for the reef POS surface. */
export const shiftRuntime = new ShiftRuntime({ appId: "reef" });
