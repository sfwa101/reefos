/**
 * Inventory Ledger Gateway — Layer 3
 * Constitution v2.0 · Article 3.1 (Clean ViewModel boundary) · Article 7.1 (Append-Only)
 *
 * Server-side surface for the inventory ledger:
 *   - appendLedgerEventFn  → INSERT-only writer (idempotency-protected)
 *   - getInventoryStateFn  → reads events, folds via Brain, returns snapshot
 *
 * No UPDATE. No DELETE. Raw DB rows never leak to callers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateStock,
  canReserve,
  createReservationEvent,
  commitReservationEvent,
  releaseReservationEvent,
  type InventoryStateSnapshot,
} from "@/core/commerce/inventory/InventoryBrain";
import type {
  InventoryReservation,
  ReservationItem,
  StockLedgerEvent,
  StockLedgerEventType,
} from "@/core/commerce/inventory/types";
import { Tracer } from "@/core/system/observability/Tracer";

const RESERVATION_TTL_MS = 15 * 60 * 1000;
const SUPPORTS_BACKORDER = false;

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const EVENT_TYPES: readonly StockLedgerEventType[] = [
  "receive",
  "reserve",
  "commit",
  "release",
  "adjust",
  "spoilage",
  "backorder",
] as const;

const draftEventSchema = z.object({
  entity_id: z.string().min(1),
  location_id: z.string().min(1),
  event_type: z.enum(EVENT_TYPES as unknown as [StockLedgerEventType, ...StockLedgerEventType[]]),
  delta: z.number().finite(),
  idempotency_key: z.string().min(1),
  actor_id: z.string().nullable().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  occurred_at: z.string().datetime().optional(),
});

const stateQuerySchema = z.object({
  entity_id: z.string().min(1),
  location_id: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────
// Row → Domain mapper (no leakage of raw DB shape)
// ─────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string;
  entity_id: string;
  location_id: string;
  event_type: string;
  delta: number | string;
  idempotency_key: string;
  actor_id: string | null;
  context: unknown;
  occurred_at: string;
}

function toDomainEvent(row: LedgerRow): StockLedgerEvent {
  return {
    id: row.id,
    entity_id: row.entity_id,
    location_id: row.location_id,
    event_type: row.event_type as StockLedgerEventType,
    delta: typeof row.delta === "string" ? Number(row.delta) : row.delta,
    idempotency_key: row.idempotency_key,
    actor_id: row.actor_id,
    context: (row.context ?? {}) as StockLedgerEvent["context"],
    occurred_at: row.occurred_at,
  };
}

// ─────────────────────────────────────────────────────────────
// Function 1: appendLedgerEventFn — INSERT-only
// ─────────────────────────────────────────────────────────────

export const appendLedgerEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => draftEventSchema.parse(input))
  .handler(async ({ data }): Promise<StockLedgerEvent> => {
    const payload = {
      entity_id: data.entity_id,
      location_id: data.location_id,
      event_type: data.event_type,
      delta: data.delta,
      idempotency_key: data.idempotency_key,
      actor_id: data.actor_id ?? null,
      context: data.context ?? {},
      occurred_at: data.occurred_at ?? new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from("inventory_ledger_events" as never)
      .insert(payload as never)
      .select("*")
      .single();

    if (error) {
      // Postgres unique_violation → idempotency replay collision.
      if ((error as { code?: string }).code === "23505") {
        throw new Error(
          `Idempotency conflict: event with key '${data.idempotency_key}' already exists.`,
        );
      }
      throw new Error(`Failed to append ledger event: ${error.message}`);
    }

    return toDomainEvent(row as unknown as LedgerRow);
  });

// ─────────────────────────────────────────────────────────────
// Function 2: getInventoryStateFn — fold(events) → snapshot
// ─────────────────────────────────────────────────────────────

export const getInventoryStateFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => stateQuerySchema.parse(input))
  .handler(async ({ data }): Promise<InventoryStateSnapshot> => {
    const { data: rows, error } = await supabase
      .from("inventory_ledger_events" as never)
      .select("*")
      .eq("entity_id", data.entity_id)
      .eq("location_id", data.location_id)
      .order("occurred_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to read ledger events: ${error.message}`);
    }

    const events = ((rows ?? []) as unknown as LedgerRow[]).map(toDomainEvent);
    return calculateStock(events);
  });

// ─────────────────────────────────────────────────────────────
// Function 3: reserveStockFn — validate availability + create pending hold
// ─────────────────────────────────────────────────────────────

const reserveItemSchema = z.object({
  entity_id: z.string().min(1),
  location_id: z.string().min(1),
  qty: z.number().finite().positive(),
});

const reserveInputSchema = z.object({
  order_ref: z.string().min(1),
  items: z.array(reserveItemSchema).min(1),
  actor_id: z.string().nullable().optional(),
});

interface ReservationRow {
  id: string;
  order_ref: string;
  state: string;
  expires_at: string;
  items: unknown;
  created_at: string;
}

async function readStateFor(
  entity_id: string,
  location_id: string,
): Promise<InventoryStateSnapshot> {
  const { data: rows, error } = await supabase
    .from("inventory_ledger_events" as never)
    .select("*")
    .eq("entity_id", entity_id)
    .eq("location_id", location_id)
    .order("occurred_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read ledger for availability check: ${error.message}`);
  }
  const events = ((rows ?? []) as unknown as LedgerRow[]).map(toDomainEvent);
  return calculateStock(events);
}

export const reserveStockFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reserveInputSchema.parse(input))
  .handler(async ({ data }): Promise<InventoryReservation> => {
    // 1. Validate availability for every line.
    for (const item of data.items) {
      const state = await readStateFor(item.entity_id, item.location_id);
      if (!canReserve(item.qty, state.available, SUPPORTS_BACKORDER)) {
        throw new Error(
          `Insufficient stock for SKU '${item.entity_id}' @ '${item.location_id}': ` +
            `requested ${item.qty}, available ${state.available}.`,
        );
      }
    }

    // 2. Persist the reservation row.
    const expires_at = new Date(Date.now() + RESERVATION_TTL_MS).toISOString();
    const { data: resRow, error: resErr } = await supabase
      .from("inventory_reservations" as never)
      .insert({
        order_ref: data.order_ref,
        state: "pending",
        expires_at,
        items: data.items,
      } as never)
      .select("*")
      .single();

    if (resErr || !resRow) {
      throw new Error(`Failed to create reservation: ${resErr?.message ?? "unknown error"}`);
    }
    const reservationRow = resRow as unknown as ReservationRow;

    // 3. Append one `reserve` ledger event per line (idempotency-protected).
    for (const item of data.items) {
      const draft = createReservationEvent(
        item.entity_id,
        item.location_id,
        item.qty,
        data.order_ref,
        `reserve_${data.order_ref}_${item.entity_id}`,
        {
          actor_id: data.actor_id ?? null,
          context: { reservation_id: reservationRow.id, location_id: item.location_id },
        },
      );

      const { error: evErr } = await supabase
        .from("inventory_ledger_events" as never)
        .insert(draft as never);

      if (evErr && (evErr as { code?: string }).code !== "23505") {
        throw new Error(
          `Failed to append reserve event for '${item.entity_id}': ${evErr.message}`,
        );
      }
    }

    return {
      id: reservationRow.id,
      order_ref: reservationRow.order_ref,
      state: reservationRow.state as InventoryReservation["state"],
      expires_at: reservationRow.expires_at,
      created_at: reservationRow.created_at,
      items: data.items,
    };
  });

// ─────────────────────────────────────────────────────────────
// Function 4 & 5: commitReservationFn / releaseReservationFn
// ─────────────────────────────────────────────────────────────

const reservationIdSchema = z.object({ reservation_id: z.string().min(1) });
const releaseInputSchema = z.object({
  reservation_id: z.string().min(1),
  reason: z.enum(["cancelled", "expired"]),
});

async function fetchReservation(reservation_id: string): Promise<ReservationRow> {
  const { data, error } = await supabase
    .from("inventory_reservations" as never)
    .select("*")
    .eq("id", reservation_id)
    .single();
  if (error || !data) {
    throw new Error(`Reservation '${reservation_id}' not found: ${error?.message ?? "missing"}`);
  }
  return data as unknown as ReservationRow;
}

function parseItems(raw: unknown): ReservationItem[] {
  if (!Array.isArray(raw)) {
    throw new Error("Reservation items payload is malformed.");
  }
  return raw as ReservationItem[];
}

export const commitReservationFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reservationIdSchema.parse(input))
  .handler(async ({ data }): Promise<InventoryReservation> => {
    const row = await fetchReservation(data.reservation_id);
    if (row.state !== "pending") {
      throw new Error(
        `Cannot commit reservation '${row.id}': state is '${row.state}', expected 'pending'.`,
      );
    }
    const items = parseItems(row.items);

    for (const item of items) {
      const draft = commitReservationEvent(
        item.entity_id,
        item.location_id,
        item.qty,
        row.order_ref,
        `commit_${row.id}_${item.entity_id}`,
        { context: { reservation_id: row.id, location_id: item.location_id } },
      );
      const { error: evErr } = await supabase
        .from("inventory_ledger_events" as never)
        .insert(draft as never);
      if (evErr && (evErr as { code?: string }).code !== "23505") {
        throw new Error(
          `Failed to append commit event for '${item.entity_id}': ${evErr.message}`,
        );
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from("inventory_reservations" as never)
      .update({ state: "committed" } as never)
      .eq("id", row.id)
      .select("*")
      .single();
    if (updErr || !updated) {
      throw new Error(`Failed to mark reservation committed: ${updErr?.message ?? "unknown"}`);
    }
    const finalRow = updated as unknown as ReservationRow;

    return {
      id: finalRow.id,
      order_ref: finalRow.order_ref,
      state: finalRow.state as InventoryReservation["state"],
      expires_at: finalRow.expires_at,
      created_at: finalRow.created_at,
      items,
    };
  });

export const releaseReservationFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => releaseInputSchema.parse(input))
  .handler(async ({ data }): Promise<InventoryReservation> => {
    const row = await fetchReservation(data.reservation_id);
    if (row.state === "committed") {
      throw new Error(`Cannot release reservation '${row.id}': already committed.`);
    }
    const items = parseItems(row.items);
    const nextState = data.reason === "expired" ? "expired" : "released";

    for (const item of items) {
      const draft = releaseReservationEvent(
        item.entity_id,
        item.location_id,
        item.qty,
        row.order_ref,
        `release_${row.id}_${item.entity_id}`,
        { context: { reservation_id: row.id, location_id: item.location_id, reason: data.reason } },
      );
      const { error: evErr } = await supabase
        .from("inventory_ledger_events" as never)
        .insert(draft as never);
      if (evErr && (evErr as { code?: string }).code !== "23505") {
        throw new Error(
          `Failed to append release event for '${item.entity_id}': ${evErr.message}`,
        );
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from("inventory_reservations" as never)
      .update({ state: nextState } as never)
      .eq("id", row.id)
      .select("*")
      .single();
    if (updErr || !updated) {
      throw new Error(`Failed to mark reservation ${nextState}: ${updErr?.message ?? "unknown"}`);
    }
    const finalRow = updated as unknown as ReservationRow;

    return {
      id: finalRow.id,
      order_ref: finalRow.order_ref,
      state: finalRow.state as InventoryReservation["state"],
      expires_at: finalRow.expires_at,
      created_at: finalRow.created_at,
      items,
    };
  });

// ─────────────────────────────────────────────────────────────
// Function 6: cleanupExpiredReservationsFn — TTL janitor
// ─────────────────────────────────────────────────────────────

export const cleanupExpiredReservationsFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({}).optional().parse(input) ?? {})
  .handler(async (): Promise<{ processed: number; failed: number }> => {
    const nowIso = new Date().toISOString();

    const { data: rows, error } = await supabase
      .from("inventory_reservations" as never)
      .select("id")
      .eq("state", "pending")
      .lt("expires_at", nowIso);

    if (error) {
      throw new Error(`Failed to scan expired reservations: ${error.message}`);
    }

    const expired = (rows ?? []) as unknown as Array<{ id: string }>;
    let processed = 0;
    let failed = 0;

    for (const row of expired) {
      try {
        await releaseReservationFn({ data: { reservation_id: row.id, reason: "expired" } });
        processed += 1;
      } catch (err) {
        failed += 1;
        Tracer.error("inventory", "log", { args: [`[janitor] Failed to expire reservation '${row.id}':`, err] });
      }
    }

    return { processed, failed };
  });
