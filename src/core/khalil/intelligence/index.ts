/**
 * Khalil — Intelligence barrel (P3.1).
 *
 * UI imports the gateway fns and types via `@/core/khalil` (which
 * re-exports this module). Internal engine paths are never imported by UI.
 */
export {
  recomputeIntelligenceSnapshotFn,
  readIntelligenceSnapshotFn,
} from "./gateway/snapshotGateway";
export { composeIntelligenceSnapshot, digestInputs } from "./replay/composeSnapshot";
export { computeSovereignSignals } from "./signals/computeSignals";
export { computePrioritiesFromSignals } from "./scoring/computePriorities";
export { composeNudgeProposals } from "./nudges/composeNudges";
export { composeWeeklyFocus } from "./planning/composeWeeklyPlan";
export {
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
} from "./contracts/types";
