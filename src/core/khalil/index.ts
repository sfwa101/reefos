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
export {
  STALE_SESSION_MS,
  computeSessionVolume,
  effectiveSets,
  isSessionStale,
  validateAddSet,
  type WorkoutSessionRow,
  type WorkoutSetRow,
  type WorkoutCurrentDTO,
  type WorkoutHistoryItemDTO,
  type StartSessionInput,
  type AddSetInput,
  type CloseSessionInput,
} from "./workout";
export {
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  computeWeightTrend,
  type WeightMeasurementRow,
  type WeightTrendDTO,
  type WeightTrendDirection,
  type WriteMeasurementInput,
  type WeightSource,
} from "./weight";
export {
  composeIntelligenceSnapshot,
  computeSovereignSignals,
  computePrioritiesFromSignals,
  composeNudgeProposals,
  composeWeeklyFocus,
  digestInputs,
  SOVEREIGN_SIGNAL_KEYS,
  PRIORITY_PILLARS,
  NUDGE_KINDS,
  FOCUS_AREAS,
  INTELLIGENCE_REPLAY_VERSION,
  type SovereignSignal,
  type SovereignSignalKey,
  type SignalSeverity,
  type PriorityScore,
  type PriorityPillarKey,
  type NudgeProposal,
  type NudgeKind,
  type WeeklyFocusPlan,
  type FocusArea,
  type IntelligenceInputs,
  type IntelligenceSnapshot,
} from "./intelligence";
export {
  MISSION_TYPES,
  MISSION_CATEGORIES,
  MISSION_STATUSES,
  MISSION_EVENT_TYPES,
  MISSION_REPLAY_VERSION,
  planMissions,
  composeDailyJourney,
  replayMissions,
  rankMissionCandidates,
  adaptCandidates,
  pickPrimary,
  pickSecondary,
  readMissionsFn,
  acceptMissionFn,
  completeMissionFn,
  dismissMissionFn,
  readDailyJourneyFn,
  recomputeJourneyFn,
  type MissionType,
  type MissionCategory,
  type MissionStatus,
  type MissionEventType,
  type MissionIntensity,
  type MissionProposal,
  type MissionRecord,
  type MissionInputs,
  type DailyJourney,
} from "./missions";
