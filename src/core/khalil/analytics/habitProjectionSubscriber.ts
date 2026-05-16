/**
 * Khalil — Habit projection subscriber (P2.3 contract).
 *
 * Per p1-event-flows.md the canonical adherence projection
 * (`khalil_adherence_daily`) is rebuilt from habit + prayer logs. In
 * P2.3 the projection is maintained synchronously by an AFTER-INSERT
 * trigger inside Postgres (see migration:
 * `khalil_habit_completion_project` → `khalil_recompute_adherence`).
 *
 * This file documents the contract and exposes a typed entrypoint for
 * the application-layer subscriber that will replace the DB trigger
 * when the sovereign event bus lands.
 *
 * Invariants:
 *   - idempotent on event.id
 *   - consumes ONLY the event payload (no cross-domain reads)
 *   - rebuildable via `replayHabitProjection`
 */
import type { KhalilHabitCompletedEnvelope } from "../habit/events";

export interface HabitProjectionPort {
  /** Idempotent upsert of one (user, day) projection row. */
  recomputeDay(userId: string, date: string): Promise<void>;
}

/** Identity hook stub — placeholder for the Identity-engine phase. */
export interface IdentityHookPort {
  notifyHabitCompleted(event: KhalilHabitCompletedEnvelope): Promise<void>;
}

export const noopIdentityHook: IdentityHookPort = {
  async notifyHabitCompleted() {
    /* identity-engine scaffolding only — wired in a later phase */
  },
};

export async function handleHabitCompleted(
  event: KhalilHabitCompletedEnvelope,
  port: HabitProjectionPort,
  identity: IdentityHookPort = noopIdentityHook,
): Promise<void> {
  if (event.name !== "khalil.habit.completed" || event.version !== 1) return;
  await port.recomputeDay(event.payload.user_id, event.payload.date);
  await identity.notifyHabitCompleted(event);
}
