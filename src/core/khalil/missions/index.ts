/**
 * Khalil — Missions barrel (P3.2). UI imports via `@/core/khalil` only.
 */
export {
  MISSION_TYPES,
  MISSION_CATEGORIES,
  MISSION_STATUSES,
  MISSION_EVENT_TYPES,
  MISSION_REPLAY_VERSION,
  type MissionType,
  type MissionCategory,
  type MissionStatus,
  type MissionEventType,
  type MissionIntensity,
  type MissionProposal,
  type MissionRecord,
  type MissionEventRecord,
  type MissionInputs,
  type DailyJourney,
} from "./contracts";
export { planMissions } from "./planner";
export { composeDailyJourney } from "./engine";
export { replayMissions, type MissionReplayResult } from "./replay";
export { rankMissionCandidates, type MissionCandidate } from "./scoring";
export { adaptCandidates, type AdaptedCandidate } from "./adaptation";
export { pickPrimary, pickSecondary } from "./selectors";
export {
  readMissionsFn,
  acceptMissionFn,
  completeMissionFn,
  dismissMissionFn,
  readDailyJourneyFn,
  recomputeJourneyFn,
} from "./gateway/missionsGateway";
