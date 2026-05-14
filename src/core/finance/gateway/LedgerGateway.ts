/**
 * Salsabil OS — Phase 1 · Wave 4
 * Layer 3 (Gateway) · LedgerGateway — Immutable Financial Spine.
 *
 * Append-only recorder of financial movements. Constitution Chapter 7
 * forbids any UPDATE or DELETE on financial balances; corrections MUST be
 * issued as compensating events (e.g. `credit.reversed`). This in-memory
 * gateway enforces those invariants client-side until the persistent
 * sovereign ledger RPCs are wired in Wave 5.
 *
 * Hard invariants:
 *   1. `appendEvent` is the ONLY mutator. No `updateBalance`, no `delete`.
 *   2. Every transaction MUST carry an `idempotency_key`. Re-submitting the
 *      same key returns the existing transaction without double-recording.
 *   3. Each append emits `ledger.transaction.appended` on the sovereign bus.
 */
import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

export type LedgerDirection = "debit" | "credit";

export interface LedgerAppendInput {
  readonly idempotency_key: string;
  readonly order_id: string;
  readonly account: string;
  readonly amount: number;
  readonly currency: string;
  readonly direction: LedgerDirection;
  readonly memo?: string;
  readonly shift_id?: string;
}

export interface LedgerTransaction extends LedgerAppendInput {
  readonly transaction_id: string;
  readonly recorded_at: number;
}

export interface ShiftAggregation {
  readonly shiftId: string;
  readonly currency: string;
  readonly credits: number;
  readonly debits: number;
  readonly net: number;
  readonly transactionCount: number;
}

const FORBIDDEN = (op: string): never => {
  throw new Error(
    `LedgerGateway: ${op} is forbidden. Issue a compensating credit/debit instead.`,
  );
};

export class LedgerGateway {
  private readonly byKey = new Map<string, LedgerTransaction>();
  private readonly log: LedgerTransaction[] = [];
  private readonly clock: () => number;
  private readonly appId?: SalsabilAppId;
  private seq = 0;

  constructor(opts?: {
    readonly clock?: () => number;
    readonly appId?: SalsabilAppId;
  }) {
    this.clock = opts?.clock ?? (() => Date.now());
    this.appId = opts?.appId;
  }

  /** APPEND-ONLY mutator. Idempotent on `idempotency_key`. */
  appendEvent(input: LedgerAppendInput): LedgerTransaction {
    if (!input.idempotency_key) {
      throw new Error("LedgerGateway.appendEvent: idempotency_key is required");
    }
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new Error("LedgerGateway.appendEvent: amount must be a non-negative finite number");
    }
    const existing = this.byKey.get(input.idempotency_key);
    if (existing) return existing;

    this.seq += 1;
    const tx: LedgerTransaction = {
      ...input,
      transaction_id: `ltx_${this.clock().toString(36)}_${this.seq.toString(36)}`,
      recorded_at: this.clock(),
    };
    this.byKey.set(tx.idempotency_key, tx);
    this.log.push(tx);

    emitSalsabilEvent("ledger.transaction.appended", {
      transactionId: tx.transaction_id,
      idempotencyKey: tx.idempotency_key,
      orderId: tx.order_id,
      amount: tx.amount,
      currency: tx.currency,
      direction: tx.direction,
      account: tx.account,
      appId: this.appId,
    });
    return tx;
  }

  /** Read-only projection of the append-only log. */
  list(): ReadonlyArray<LedgerTransaction> {
    return this.log;
  }

  findByIdempotencyKey(key: string): LedgerTransaction | undefined {
    return this.byKey.get(key);
  }

  // Constitutional guards — these MUST throw. Kept as runtime sentries.
  updateBalance(): never {
    return FORBIDDEN("updateBalance");
  }
  deleteTransaction(): never {
    return FORBIDDEN("deleteTransaction");
  }
}

/** Process-singleton for app-wide consumers. */
export const ledgerGateway = new LedgerGateway({ appId: "reef" });
