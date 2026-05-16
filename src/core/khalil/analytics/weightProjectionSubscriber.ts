/**
 * Khalil — Weight projection subscriber (P2.7).
 *
 * Persistence is DB-trigger-driven; subscriber remains idempotent
 * on event.id for future fan-out (insights cache invalidation, etc.).
 */
import type { KhalilWeightEventEnvelope } from "../weight/events";

const seen = new Set<string>();

export function handleWeightEvent(env: KhalilWeightEventEnvelope): void {
  if (seen.has(env.id)) return;
  seen.add(env.id);
}

export function __resetWeightSubscriberForTests() {
  seen.clear();
}
