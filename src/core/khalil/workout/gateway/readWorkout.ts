/**
 * Khalil — Workout read gateways (P2.7).
 *
 * `readCurrent`: returns the live (open or auto-closed-on-stale) session
 *   plus its sets and server-derived volume.
 * `readHistory`: returns the most recent N closed sessions with rollups.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  readHistoryInputSchema,
  type WorkoutCurrentDTO,
  type WorkoutHistoryItemDTO,
  type WorkoutSessionRow,
  type WorkoutSetRow,
} from "../schemas";
import { isSessionStale } from "../runtime/staleSession";
import {
  computeSessionVolume,
  computeSetsCount,
} from "../runtime/computeVolume";

interface RawSet {
  id: string;
  session_id: string;
  exercise_slug: string;
  set_index: number;
  reps: number;
  weight_kg: number;
  rpe: number | null;
  is_correction: boolean;
  corrects_set_id: string | null;
  created_at: string;
}

function mapSet(r: RawSet): WorkoutSetRow {
  return {
    id: r.id,
    sessionId: r.session_id,
    exerciseSlug: r.exercise_slug,
    setIndex: r.set_index,
    reps: Number(r.reps),
    weightKg: Number(r.weight_kg),
    rpe: r.rpe === null ? null : Number(r.rpe),
    isCorrection: Boolean(r.is_correction),
    correctsSetId: r.corrects_set_id,
    createdAt: r.created_at,
  };
}

export const readWorkoutCurrentFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WORKOUT_READ),
  ])
  .handler(async ({ context }): Promise<WorkoutCurrentDTO> => {
    const { supabase, userId } = context;

    const { data: sess, error: sessErr } = await supabase
      .from("khalil_workout_session")
      .select("id,started_at,closed_at,focus,notes_key")
      .eq("user_id", userId)
      .is("closed_at", null)
      .maybeSingle();
    if (sessErr) {
      throw new Error(`khalil_workout_current_read_failed: ${sessErr.message}`);
    }

    if (!sess) {
      return { session: null, sets: [], totalVolumeKg: 0, isStale: false };
    }

    const stale = isSessionStale(sess.started_at as string, Date.now());
    if (stale) {
      // Auto-close stale session; surface as no live session.
      await supabase
        .from("khalil_workout_session")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", sess.id);
      return { session: null, sets: [], totalVolumeKg: 0, isStale: true };
    }

    const { data: setRows, error: setErr } = await supabase
      .from("khalil_workout_set")
      .select("id,session_id,exercise_slug,set_index,reps,weight_kg,rpe,is_correction,corrects_set_id,created_at")
      .eq("session_id", sess.id)
      .order("set_index", { ascending: true });
    if (setErr) {
      throw new Error(`khalil_workout_sets_read_failed: ${setErr.message}`);
    }

    const sets: WorkoutSetRow[] = ((setRows ?? []) as RawSet[]).map(mapSet);
    const session: WorkoutSessionRow = {
      id: sess.id as string,
      startedAt: sess.started_at as string,
      closedAt: (sess.closed_at as string | null) ?? null,
      focus: (sess.focus as string | null) ?? null,
      notesKey: (sess.notes_key as string | null) ?? null,
    };
    return {
      session,
      sets,
      totalVolumeKg: computeSessionVolume(sets),
      isStale: false,
    };
  });

export const readWorkoutHistoryFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WORKOUT_READ),
  ])
  .inputValidator((input) => readHistoryInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<WorkoutHistoryItemDTO[]> => {
    const { supabase, userId } = context;

    const { data: sessions, error } = await supabase
      .from("khalil_workout_session")
      .select("id,started_at,closed_at,focus,notes_key")
      .eq("user_id", userId)
      .not("closed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) {
      throw new Error(`khalil_workout_history_read_failed: ${error.message}`);
    }
    const list = sessions ?? [];
    if (list.length === 0) return [];

    const ids = list.map((s) => s.id as string);
    const { data: setRows, error: setErr } = await supabase
      .from("khalil_workout_set")
      .select("id,session_id,exercise_slug,set_index,reps,weight_kg,rpe,is_correction,corrects_set_id,created_at")
      .in("session_id", ids);
    if (setErr) {
      throw new Error(`khalil_workout_history_sets_read_failed: ${setErr.message}`);
    }
    const bySession = new Map<string, WorkoutSetRow[]>();
    for (const r of (setRows ?? []) as RawSet[]) {
      const arr = bySession.get(r.session_id) ?? [];
      arr.push(mapSet(r));
      bySession.set(r.session_id, arr);
    }

    return list.map((s) => {
      const sets = bySession.get(s.id as string) ?? [];
      const session: WorkoutSessionRow = {
        id: s.id as string,
        startedAt: s.started_at as string,
        closedAt: (s.closed_at as string | null) ?? null,
        focus: (s.focus as string | null) ?? null,
        notesKey: (s.notes_key as string | null) ?? null,
      };
      return {
        session,
        setsCount: computeSetsCount(sets),
        totalVolumeKg: computeSessionVolume(sets),
      };
    });
  });
