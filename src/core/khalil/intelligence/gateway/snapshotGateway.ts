/**
 * Khalil — Intelligence gateway (P3.1).
 *
 * Server-only. Reads projections, runs the pure intelligence pipeline,
 * persists an append-only snapshot, and returns the latest snapshot to
 * the caller. UI imports only the gateway barrel.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  composeIntelligenceSnapshot,
} from "../replay/composeSnapshot";
import type {
  IntelligenceInputs,
  IntelligenceSnapshot,
} from "../contracts/types";
import type { KhalilIdentityLevel } from "../../identity/runtime/config";
import type { RecoveryMode } from "../../recovery/schemas";

const recomputeInputSchema = z.object({}).optional();

function shiftDateIso(refIso: string, deltaDays: number): string {
  const t = Date.parse(`${refIso}T00:00:00Z`) + deltaDays * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

async function loadInputs(
  // Untyped to keep gateway insulated from Supabase generic surface.
  supabase: any,
  userId: string,
  now: Date,
): Promise<IntelligenceInputs> {
  const today = now.toISOString().slice(0, 10);
  const since = shiftDateIso(today, -13);

  const [
    { data: identityRow },
    { data: recoveryRow },
    { data: adherenceRows },
    { data: weightRow },
    { data: workoutRows },
    { data: coachRow },
  ] = await Promise.all([
    (supabase as any)
      .from("khalil_identity_state")
      .select("current_level,current_score")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("khalil_recovery_state")
      .select("current_state")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("khalil_adherence_daily")
      .select("for_date,prayer_score,habit_score,combined_score")
      .eq("user_id", userId)
      .gte("for_date", since)
      .lte("for_date", today)
      .order("for_date", { ascending: true }),
    (supabase as any)
      .from("khalil_weight_projection")
      .select("latest_kg,avg_7d,avg_30d,delta_7d,delta_30d")
      .eq("user_id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("khalil_workout_volume_daily")
      .select("for_date,volume_kg")
      .eq("user_id", userId)
      .gte("for_date", since)
      .lte("for_date", today)
      .order("for_date", { ascending: true }),
    (supabase as any)
      .from("khalil_coach_proposal")
      .select("kind")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Build dense 14-day arrays (oldest → newest).
  const adherenceByDate = new Map<string, { p: number; h: number; c: number }>();
  for (const r of (adherenceRows ?? []) as Array<Record<string, unknown>>) {
    adherenceByDate.set(r.for_date as string, {
      p: Number(r.prayer_score ?? 0),
      h: Number(r.habit_score ?? 0),
      c: Number(r.combined_score ?? 0),
    });
  }
  const volumeByDate = new Map<string, number>();
  for (const r of (workoutRows ?? []) as Array<Record<string, unknown>>) {
    volumeByDate.set(r.for_date as string, Number(r.volume_kg ?? 0));
  }

  const prayer14d: number[] = [];
  const habit14d: number[] = [];
  const adherence14d: number[] = [];
  const workoutVolume14d: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = shiftDateIso(today, -i);
    const a = adherenceByDate.get(d);
    prayer14d.push(a?.p ?? 0);
    habit14d.push(a?.h ?? 0);
    adherence14d.push(a?.c ?? 0);
    workoutVolume14d.push(volumeByDate.get(d) ?? 0);
  }

  const identityLevel: KhalilIdentityLevel =
    ((identityRow as { current_level?: string } | null)?.current_level as
      | KhalilIdentityLevel
      | undefined) ?? "seed";
  const identityScore = Number(
    (identityRow as { current_score?: number } | null)?.current_score ?? 0,
  );
  const recovery: RecoveryMode =
    ((recoveryRow as { current_state?: string } | null)?.current_state as
      | RecoveryMode
      | undefined) ?? "off";

  const w = weightRow as Record<string, unknown> | null;
  return {
    now: now.toISOString(),
    identityLevel,
    identityScore: Number.isFinite(identityScore) ? identityScore : 0,
    recovery,
    adherence14d,
    prayer14d,
    habit14d,
    workoutVolume14d,
    weight: w
      ? {
          latestKg: w.latest_kg != null ? Number(w.latest_kg) : null,
          avg7d: w.avg_7d != null ? Number(w.avg_7d) : null,
          avg30d: w.avg_30d != null ? Number(w.avg_30d) : null,
          delta7d: w.delta_7d != null ? Number(w.delta_7d) : null,
          delta30d: w.delta_30d != null ? Number(w.delta_30d) : null,
        }
      : undefined,
    pendingCoachProposalKind: (coachRow as { kind?: string } | null)?.kind ?? null,
  };
}

async function persistSnapshot(
  supabase: any,
  userId: string,
  snap: IntelligenceSnapshot,
): Promise<void> {
  const { error } = await supabase
    .from("khalil_intelligence_snapshot")
    .insert({
      user_id: userId,
      identity_level: snap.identityLevel,
      recovery_mode: snap.recovery,
      signals: snap.signals,
      priorities: snap.priorities,
      nudges: snap.nudges,
      weekly_focus: snap.weeklyFocus,
      inputs_digest: snap.inputsDigest,
      replay_version: snap.replayVersion,
      generated_at: snap.generatedAt,
    });
  if (error) {
    throw new Error(`khalil_intel_snapshot_persist_failed: ${error.message}`);
  }
}

export const recomputeIntelligenceSnapshotFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.INTELLIGENCE_RECOMPUTE),
  ])
  .inputValidator((input) => recomputeInputSchema.parse(input))
  .handler(async ({ context }): Promise<IntelligenceSnapshot> => {
    const { supabase, userId } = context as any;
    const now = new Date();
    const inputs = await loadInputs(supabase, userId, now);
    const snap = composeIntelligenceSnapshot(inputs);
    await persistSnapshot(supabase, userId, snap);
    return snap;
  });

export const readIntelligenceSnapshotFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.INTELLIGENCE_READ),
  ])
  .handler(async ({ context }): Promise<IntelligenceSnapshot | null> => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("khalil_intelligence_snapshot")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(`khalil_intel_snapshot_read_failed: ${error.message}`);
    }
    if (!data) return null;
    return {
      generatedAt: data.generated_at as string,
      replayVersion: Number(data.replay_version ?? 1),
      identityLevel: data.identity_level,
      recovery: data.recovery_mode,
      signals: (data.signals ?? []) as IntelligenceSnapshot["signals"],
      priorities: (data.priorities ?? []) as IntelligenceSnapshot["priorities"],
      nudges: (data.nudges ?? []) as IntelligenceSnapshot["nudges"],
      weeklyFocus: data.weekly_focus as IntelligenceSnapshot["weeklyFocus"],
      inputsDigest: data.inputs_digest as string,
    };
  });
