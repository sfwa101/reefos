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
  type InventoryStateSnapshot,
} from "../domain/InventoryBrain";
import type {
  StockLedgerEvent,
  StockLedgerEventType,
} from "../domain/types";

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
