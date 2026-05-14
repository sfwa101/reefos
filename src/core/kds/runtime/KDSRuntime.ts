/**
 * Salsabil OS — Phase 1 · Wave 5
 * Layer 4 (Domain) · KDS Fulfillment State Machine.
 *
 * Append-only, event-emitting orchestrator for kitchen-bound tickets.
 *
 * Hard invariants:
 *   1. Tickets are created exclusively via {@link KDSRuntime.createTicket},
 *      typically from {@link KDSOrderPlacedReactor}. UI never instantiates.
 *   2. Every state transition emits `kds.ticket.updated` on the sovereign
 *      bus. No silent mutations.
 *   3. State transitions are linearly ordered:
 *      queued → preparing → ready → delivered. Any other request throws.
 *   4. Zero React, zero Supabase here. The optional sink (gateway) handles
 *      durable persistence; the in-memory projection serves the live UI.
 */

import { emitSalsabilEvent, type SalsabilAppId } from "@/core/events";

export type KDSTicketStatus = "queued" | "preparing" | "ready" | "delivered";

export interface KDSTicketLine {
  readonly lineId: string;
  readonly productId: string;
  readonly name: string;
  readonly qty: number;
  readonly capabilities: ReadonlyArray<string>;
}

export interface KDSTicket {
  readonly id: string;
  readonly orderId: string;
  readonly status: KDSTicketStatus;
  readonly lines: ReadonlyArray<KDSTicketLine>;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface CreateKDSTicketInput {
  readonly orderId: string;
  readonly lines: ReadonlyArray<KDSTicketLine>;
}

/** Optional durable sink — write-through gateway hook. */
export interface KDSDurableSink {
  onCreated?: (ticket: KDSTicket) => void;
  onUpdated?: (ticket: KDSTicket, previousStatus: KDSTicketStatus) => void;
}

export type KDSRuntimeListener = (
  tickets: ReadonlyArray<KDSTicket>,
) => void;

const NEXT_STATUS: Record<KDSTicketStatus, KDSTicketStatus | null> = {
  queued: "preparing",
  preparing: "ready",
  ready: "delivered",
  delivered: null,
};

const assertTransition = (
  from: KDSTicketStatus,
  to: KDSTicketStatus,
): void => {
  if (NEXT_STATUS[from] !== to) {
    throw new Error(
      `KDSRuntime: illegal transition ${from} → ${to}`,
    );
  }
};

export class KDSRuntime {
  private tickets: KDSTicket[] = [];
  private readonly listeners = new Set<KDSRuntimeListener>();
  private readonly appId?: SalsabilAppId;
  private readonly clock: () => number;
  private readonly sink?: KDSDurableSink;
  private readonly idFactory: (orderId: string) => string;

  constructor(opts?: {
    readonly appId?: SalsabilAppId;
    readonly clock?: () => number;
    readonly sink?: KDSDurableSink;
    readonly idFactory?: (orderId: string) => string;
  }) {
    this.appId = opts?.appId;
    this.clock = opts?.clock ?? (() => Date.now());
    this.sink = opts?.sink;
    this.idFactory =
      opts?.idFactory ??
      ((orderId) => `kds_${this.clock().toString(36)}_${orderId.slice(0, 8)}`);
  }

  /* ───────── intents ───────── */

  createTicket(input: CreateKDSTicketInput): KDSTicket {
    if (input.lines.length === 0) {
      throw new Error("KDSRuntime.createTicket: lines required");
    }
    const now = this.clock();
    const ticket: KDSTicket = {
      id: this.idFactory(input.orderId),
      orderId: input.orderId,
      status: "queued",
      lines: input.lines,
      createdAt: now,
      updatedAt: now,
    };
    this.tickets = [...this.tickets, ticket];
    this.sink?.onCreated?.(ticket);
    emitSalsabilEvent("kds.ticket.created", {
      ticketId: ticket.id,
      orderId: ticket.orderId,
      lineCount: ticket.lines.length,
      appId: this.appId,
    });
    this.notify();
    return ticket;
  }

  markPreparing(ticketId: string): KDSTicket {
    return this.transition(ticketId, "preparing");
  }

  markReady(ticketId: string): KDSTicket {
    return this.transition(ticketId, "ready");
  }

  markDelivered(ticketId: string): KDSTicket {
    return this.transition(ticketId, "delivered");
  }

  /* ───────── observation ───────── */

  getTickets(): ReadonlyArray<KDSTicket> {
    return this.tickets;
  }

  subscribe(listener: KDSRuntimeListener): () => void {
    this.listeners.add(listener);
    listener(this.tickets);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /* ───────── internals ───────── */

  private transition(ticketId: string, to: KDSTicketStatus): KDSTicket {
    const existing = this.tickets.find((t) => t.id === ticketId);
    if (!existing) {
      throw new Error(`KDSRuntime: ticket not found: ${ticketId}`);
    }
    assertTransition(existing.status, to);
    const previousStatus = existing.status;
    const updated: KDSTicket = {
      ...existing,
      status: to,
      updatedAt: this.clock(),
    };
    this.tickets = this.tickets.map((t) => (t.id === ticketId ? updated : t));
    this.sink?.onUpdated?.(updated, previousStatus);
    emitSalsabilEvent("kds.ticket.updated", {
      ticketId: updated.id,
      orderId: updated.orderId,
      previousStatus,
      status: to,
      appId: this.appId,
    });
    this.notify();
    return updated;
  }

  private notify(): void {
    for (const l of this.listeners) l(this.tickets);
  }
}

/** Process-singleton consumed by the KDS UI and reactors. */
export const kdsRuntime = new KDSRuntime({ appId: "reef" });
