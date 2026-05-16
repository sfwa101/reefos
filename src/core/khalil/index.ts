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
export {
  validateRecoveryTransition,
  resolveRecoveryState,
  isRecoverySoftened,
  recoveryModeSchema,
  type RecoveryMode,
  type RecoveryStateDTO,
  type RecoveryEventRow,
  type ToggleRecoveryInput,
} from "./recovery";
export {
  KHALIL_IDENTITY_LEVELS,
  LEVEL_INDEX,
  LEVEL_THRESHOLDS,
  WINDOW_WEIGHTS,
  RECOVERY_SOFTENING,
  levelByIndex,
  computeRollingWindows,
  computeIdentityScore,
  resolveIdentityLevel,
  shouldEvolveIdentity,
  computeIdentity,
  identityLevelSchema,
  type KhalilIdentityLevel,
  type IdentityStateDTO,
  type IdentityEventRow,
  type RollingWindowsDTO,
  type RollingWindows,
  type AdherenceDay,
  type LevelThreshold,
} from "./identity";
export {
  coachProposalKindSchema,
  coachProposalStatusSchema,
  acceptCoachInputSchema,
  dismissCoachInputSchema,
  type CoachProposalKind,
  type CoachProposalStatus,
  type CoachProposalDTO,
  type CoachProposalPayload,
  type AcceptCoachInput,
  type DismissCoachInput,
} from "./coach";
