/**
 * Khalil — Missions gateway (P3.2).
 *
 * Server-only. Reads projections + the latest intelligence snapshot,
 * runs the pure mission engine, persists journey + missions, and exposes
 * lifecycle transitions (accept / complete / dismiss). All capability
 * gated. Append-only events for every transition.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { composeDailyJourney } from "../engine";
import { planMissions } from "../planner";
import type {
  DailyJourney,
  MissionInputs,
  MissionProposal,
  MissionRecord,
} from "../contracts";
import type { IntelligenceSnapshot } from "../../intelligence/contracts/types";
import type { KhalilIdentityLevel } from "../../identity/runtime/config";
import type { RecoveryMode } from "../../recovery/schemas";

const ACTIVE_LIMIT = 12;
const HISTORY_LIMIT = 30;

const idInput = z.object({
  missionId: z.string().min(8).max(128),
  clientEventId: z.string().min(8).max(128),
});

function shiftDateIso(refIso: string, deltaDays: number): string {
  const t = Date.parse(`${refIso}T00:00:00Z`) + deltaDays * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

async function loadInputs(
  supabase: any,
  userId: string,
  now: Date,
): Promise<MissionInputs | null> {
  const today = now.toISOString().slice(0, 10);
  const since = shiftDateIso(today, -13);

  const [
    { data: identityRow },
    { data: recoveryRow },
    { data: intelRow },
    { data: adherenceRows },
    { data: failureRows },
  ] = await Promise.all([
    supabase
      .from("khalil_identity_state")
      .select("current_level,current_score")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("khalil_recovery_state")
      .select("current_state")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("khalil_intelligence_snapshot")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("khalil_adherence_daily")
      .select("for_date,combined_score")
      .eq("user_id", userId)
      .gte("for_date", since)
      .lte("for_date", today)
      .order("for_date", { ascending: true }),
    supabase
      .from("khalil_mission")
      .select("status,created_at")
      .eq("user_id", userId)
      .in("status", ["dismissed", "expired"])
      .gte("created_at", new Date(Date.parse(`${since}T00:00:00Z`)).toISOString()),
  ]);

  if (!intelRow) return null;

  const identityLevel: KhalilIdentityLevel =
    ((identityRow as any)?.current_level as KhalilIdentityLevel) ?? "seed";
  const identityScore = Number((identityRow as any)?.current_score ?? 0);
  const recovery: RecoveryMode =
    ((recoveryRow as any)?.current_state as RecoveryMode) ?? "off";

  const intel: IntelligenceSnapshot = {
    generatedAt: (intelRow as any).generated_at,
    replayVersion: Number((intelRow as any).replay_version ?? 1),
    identityLevel: (intelRow as any).identity_level,
    recovery: (intelRow as any).recovery_mode,
    signals: ((intelRow as any).signals ?? []),
    priorities: ((intelRow as any).priorities ?? []),
    nudges: ((intelRow as any).nudges ?? []),
    weeklyFocus: (intelRow as any).weekly_focus,
    inputsDigest: (intelRow as any).inputs_digest,
  };

  // Active streak: longest tail of days with combined_score >= 0.6.
  let activeStreakDays = 0;
  for (let i = (adherenceRows ?? []).length - 1; i >= 0; i--) {
    const row = (adherenceRows as any[])[i];
    if (Number(row?.combined_score ?? 0) >= 0.6) activeStreakDays++;
    else break;
  }

  const recentFailures = (failureRows as any[] | null)?.length ?? 0;

  return {
    now: now.toISOString(),
    localDate: today,
    userId,
    identityLevel,
    identityScore: Number.isFinite(identityScore) ? identityScore : 0,
    recovery,
    intelligence: intel,
    recentFailures,
    activeStreakDays,
  };
}

async function persistMissions(
  supabase: any,
  userId: string,
  missions: readonly MissionProposal[],
  now: Date,
): Promise<MissionRecord[]> {
  if (missions.length === 0) return [];
  const rows = missions.map((m) => ({
    user_id: userId,
    mission_type: m.missionType,
    title_key: m.titleKey,
    body_key: m.bodyKey,
    intensity: m.intensity,
    category: m.category,
    status: "proposed",
    generated_from_snapshot: m.generatedFromSnapshot,
    stable_key: m.stableKey,
    expires_at: new Date(now.getTime() + m.ttlMs).toISOString(),
  }));
  const { data, error } = await supabase
    .from("khalil_mission")
    .upsert(rows, { onConflict: "user_id,stable_key", ignoreDuplicates: true })
    .select("id,mission_type,title_key,body_key,intensity,category,status,generated_from_snapshot,stable_key,expires_at,created_at");
  if (error) {
    throw new Error(`khalil_mission_persist_failed: ${error.message}`);
  }
  const persisted = (data ?? []) as any[];
  // Audit events for newly created missions.
  if (persisted.length > 0) {
    const events = persisted.map((r) => ({
      mission_id: r.id,
      user_id: userId,
      event_type: "created",
      payload: { stableKey: r.stable_key, snapshot: r.generated_from_snapshot },
    }));
    await supabase.from("khalil_mission_event").insert(events);
  }
  return persisted.map(mapMissionRow);
}

async function persistJourney(
  supabase: any,
  userId: string,
  journey: DailyJourney,
): Promise<void> {
  const { error } = await supabase
    .from("khalil_daily_journey")
    .insert({
      user_id: userId,
      local_date: journey.localDate,
      journey_payload: journey,
      inputs_digest: journey.inputsDigest,
    });
  if (error) {
    // Append-only: a same-digest race throws ok-ish; ignore unique conflicts.
    if (!/duplicate/i.test(error.message)) {
      throw new Error(`khalil_journey_persist_failed: ${error.message}`);
    }
  }
}

function mapMissionRow(row: any): MissionRecord {
  return {
    id: row.id,
    missionType: row.mission_type,
    category: row.category,
    intensity: row.intensity,
    titleKey: row.title_key,
    bodyKey: row.body_key,
    status: row.status,
    generatedFromSnapshot: row.generated_from_snapshot,
    stableKey: row.stable_key,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

async function transitionMission(
  supabase: any,
  userId: string,
  missionId: string,
  nextStatus: "active" | "completed" | "dismissed",
  clientEventId: string,
): Promise<{ status: "ok" | "duplicate" | "rejected"; finalStatus?: string; reason?: string }> {
  const { data: row, error: readErr } = await supabase
    .from("khalil_mission")
    .select("id,user_id,status,expires_at")
    .eq("id", missionId)
    .maybeSingle();
  if (readErr) throw new Error(`khalil_mission_read_failed: ${readErr.message}`);
  if (!row || row.user_id !== userId) {
    return { status: "rejected", reason: "not_found" };
  }
  if (row.status === nextStatus) {
    return { status: "duplicate", finalStatus: row.status };
  }
  if (row.status === "completed" || row.status === "dismissed" || row.status === "expired") {
    return { status: "rejected", reason: "terminal", finalStatus: row.status };
  }
  if (new Date(row.expires_at).getTime() <= Date.now() && nextStatus !== "dismissed") {
    await supabase
      .from("khalil_mission")
      .update({ status: "expired" })
      .eq("id", row.id)
      .eq("status", row.status);
    await supabase.from("khalil_mission_event").insert({
      mission_id: row.id,
      user_id: userId,
      event_type: "expired",
      payload: { source: nextStatus },
      client_event_id: clientEventId,
    });
    return { status: "rejected", reason: "expired" };
  }
  // Valid transition rules.
  const allowed =
    (row.status === "proposed" && (nextStatus === "active" || nextStatus === "dismissed")) ||
    (row.status === "active" && (nextStatus === "completed" || nextStatus === "dismissed"));
  if (!allowed) {
    return { status: "rejected", reason: "illegal_transition" };
  }

  const { error: updErr } = await supabase
    .from("khalil_mission")
    .update({ status: nextStatus })
    .eq("id", row.id)
    .eq("status", row.status);
  if (updErr) throw new Error(`khalil_mission_update_failed: ${updErr.message}`);

  const eventType =
    nextStatus === "active" ? "accepted" :
    nextStatus === "completed" ? "completed" : "dismissed";
  await supabase.from("khalil_mission_event").insert({
    mission_id: row.id,
    user_id: userId,
    event_type: eventType,
    payload: { from: row.status, to: nextStatus },
    client_event_id: clientEventId,
  });
  return { status: "ok", finalStatus: nextStatus };
}

// ─── Server fns ────────────────────────────────────────────────────────────────

export const readMissionsFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.MISSIONS_READ),
  ])
  .handler(async ({ context }): Promise<{
    active: MissionRecord[];
    history: MissionRecord[];
  }> => {
    const { supabase, userId } = context as any;
    const [{ data: activeRows }, { data: historyRows }] = await Promise.all([
      supabase
        .from("khalil_mission")
        .select("id,mission_type,title_key,body_key,intensity,category,status,generated_from_snapshot,stable_key,expires_at,created_at")
        .eq("user_id", userId)
        .in("status", ["proposed", "active"])
        .order("created_at", { ascending: false })
        .limit(ACTIVE_LIMIT),
      supabase
        .from("khalil_mission")
        .select("id,mission_type,title_key,body_key,intensity,category,status,generated_from_snapshot,stable_key,expires_at,created_at")
        .eq("user_id", userId)
        .in("status", ["completed", "expired", "dismissed"])
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);
    return {
      active: ((activeRows ?? []) as any[]).map(mapMissionRow),
      history: ((historyRows ?? []) as any[]).map(mapMissionRow),
    };
  });

export const recomputeJourneyFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.JOURNEY_READ),
  ])
  .handler(async ({ context }): Promise<{
    journey: DailyJourney | null;
    missions: MissionRecord[];
  }> => {
    const { supabase, userId } = context as any;
    const now = new Date();
    const inputs = await loadInputs(supabase, userId, now);
    if (!inputs) return { journey: null, missions: [] };
    const journey = composeDailyJourney(inputs);
    const missions = planMissions(inputs);
    const persisted = await persistMissions(supabase, userId, missions, now);
    await persistJourney(supabase, userId, journey);
    return { journey, missions: persisted };
  });

export const readDailyJourneyFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.JOURNEY_READ),
  ])
  .handler(async ({ context }): Promise<DailyJourney | null> => {
    const { supabase, userId } = context as any;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("khalil_daily_journey")
      .select("journey_payload")
      .eq("user_id", userId)
      .eq("local_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return (data as any).journey_payload as DailyJourney;
  });

export const acceptMissionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.MISSIONS_ACCEPT),
  ])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    return transitionMission(supabase, userId, data.missionId, "active", data.clientEventId);
  });

export const completeMissionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.MISSIONS_COMPLETE),
  ])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    return transitionMission(supabase, userId, data.missionId, "completed", data.clientEventId);
  });

export const dismissMissionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.MISSIONS_ACCEPT),
  ])
  .inputValidator((input) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    return transitionMission(supabase, userId, data.missionId, "dismissed", data.clientEventId);
  });
