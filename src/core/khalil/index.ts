/**
 * Khalil — domain barrel.
 *
 * Re-exports the public gateway and capability/event/i18n constants. UI
 * MUST import only from `@/core/khalil` — never deep paths into
 * `runtime/`, `orchestrator/`, or sub-domain internals (Art. VI).
 */
export * from "./gateway";
export { KHALIL_CAP, type KhalilCapabilityKey } from "./capabilities";
export { KHALIL_EVENT, type KhalilEventName } from "./events";
export { khalilKeys } from "./queryKeys";
export { kt, setKhalilLocale, getKhalilLocale, type KhalilLocale } from "./i18n";
export { khalilOfflineQueue, type KhalilQueuedIntent } from "./offlineQueue";
export {
  computePrayerAdherence,
  computeHabitAdherence,
  computeCombinedAdherence,
} from "./analytics/computeAdherence";
