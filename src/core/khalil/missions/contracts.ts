/**
 * Khalil — Mission System contracts (P3.2).
 *
 * Wire-level types. Replay-safe: every record is computed by PURE engines
 * from a single deterministic input bundle. No randomness, no clock.
 */
import type { KhalilIdentityLevel } from "../identity/runtime/config";
import type { RecoveryMode } from "../recovery/schemas";
import type { IntelligenceSnapshot } from "../intelligence/contracts/types";

export const MISSION_TYPES = [
  "prayer_recovery",
  "discipline_chain",
  "body_rebuild",
  "deep_focus",
  "sleep_repair",
  "dopamine_reset",
  "consistency_guard",
  "identity_proof",
  "resilience_push",
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_CATEGORIES = [
  "spiritual",
  "discipline",
  "body",
  "focus",
  "rest",
  "recovery",
  "identity",
] as const;
export type MissionCategory = (typeof MISSION_CATEGORIES)[number];

export const MISSION_STATUSES = [
  "proposed",
  "active",
  "completed",
  "expired",
  "dismissed",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_EVENT_TYPES = [
  "created",
  "accepted",
  "completed",
  "dismissed",
  "expired",
] as const;
export type MissionEventType = (typeof MISSION_EVENT_TYPES)[number];

/** 1 = whisper, 5 = peak. Adaptive scaler bounds the value. */
export type MissionIntensity = 1 | 2 | 3 | 4 | 5;

export interface MissionProposal {
  /** Deterministic id derived from FNV-1a(user|date|type|stableKey). */
  id: string;
  /** Stable dedupe key (same inputs → same key). */
  stableKey: string;
  missionType: MissionType;
  category: MissionCategory;
  intensity: MissionIntensity;
  titleKey: string;
  bodyKey: string;
  /** Source inputs digest from the intelligence snapshot. */
  generatedFromSnapshot: string;
  /** Mission lifespan in ms — server enforces. */
  ttlMs: number;
  /** Audit: why this mission was generated. */
  rationale: string[];
}

export interface MissionRecord {
  id: string;
  missionType: MissionType;
  category: MissionCategory;
  intensity: MissionIntensity;
  titleKey: string;
  bodyKey: string;
  status: MissionStatus;
  generatedFromSnapshot: string;
  stableKey: string;
  expiresAt: string;
  createdAt: string;
}

export interface MissionEventRecord {
  id: string;
  missionId: string;
  eventType: MissionEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface DailyJourney {
  generatedAt: string;
  localDate: string;
  inputsDigest: string;
  /** The single most important mission for the day. */
  primaryMission: MissionProposal | null;
  /** A supporting mission of a different category. */
  secondaryMission: MissionProposal | null;
  /** Recommended habit-emphasis area. */
  supportingHabitFocus: "spiritual" | "discipline" | "body" | "rest" | "consistency";
  prayerEmphasis: "low" | "medium" | "high";
  recoveryEmphasis: "low" | "medium" | "high";
  bodyEmphasis: "low" | "medium" | "high";
  focusEmphasis: "low" | "medium" | "high";
  antiOverloadProtections: string[];
  rationaleKey: string;
}

/**
 * Inputs into the mission engine. Pulled from projections + intelligence.
 * `now` and `localDate` are captured ONCE by the server and threaded through.
 */
export interface MissionInputs {
  now: string;
  localDate: string;
  userId: string;
  identityLevel: KhalilIdentityLevel;
  identityScore: number;
  recovery: RecoveryMode;
  intelligence: IntelligenceSnapshot;
  /** Recent failure markers — count of declines/expirations last 14d. */
  recentFailures: number;
  /** Active streak length in days (combined adherence ≥ 0.6). */
  activeStreakDays: number;
}

export const MISSION_REPLAY_VERSION = 1;
