/**
 * Khalil — Prayer projection subscriber (P2.2 contract).
 *
 * Per p1-event-flows.md the canonical adherence projection
 * (`khalil_adherence_daily`) is rebuilt from the prayer log. In P2.2
 * the projection is maintained synchronously by an AFTER-INSERT trigger
 * inside Postgres (see migration: `khalil_prayer_log_after_insert` →
 * `khalil_recompute_adherence`).
 *
 * This file documents the contract and exposes a typed entrypoint for
 * the application-layer subscriber that will replace the DB trigger
 * when the sovereign event bus lands (out of P2.2 scope).
 *
 * Invariants:
 *   - idempotent on event.id
 *   - consumes ONLY the event payload (no cross-domain reads)
 *   - rebuildable via `replayPrayerProjection`
 */
import type { KhalilPrayerLoggedEnvelope } from "../prayer/events";

export interface PrayerProjectionPort {
  /** Idempotent upsert of one (user, day) projection row. */
  recomputeDay(userId: string, date: string): Promise<void>;
}

export async function handlePrayerLogged(
  event: KhalilPrayerLoggedEnvelope,
  port: PrayerProjectionPort,
): Promise<void> {
  if (event.name !== "khalil.prayer.logged" || event.version !== 1) return;
  await port.recomputeDay(event.payload.user_id, event.payload.logged_for_date);
}
