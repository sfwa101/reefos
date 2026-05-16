/**
 * Khalil — Workout addSet gateway (P2.7).
 *
 * Append-only. Idempotent on (user_id, client_event_id). Server validates
 * session ownership + that the target session is still open.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { addSetInputSchema } from "../schemas";
import { validateAddSet } from "../runtime/validateAddSet";
import { classifyWorkoutInsertError } from "../runtime/dedupeWorkout";

export const addWorkoutSetFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WORKOUT_SET_WRITE),
  ])
  .inputValidator((input) => addSetInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const verdict = validateAddSet(data);
    if (!verdict.ok) {
      return { status: "rejected" as const, reason: verdict.reason };
    }

    // Ownership + open-session backstop.
    const { data: sess, error: sessErr } = await supabase
      .from("khalil_workout_session")
      .select("id,user_id,closed_at")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sessErr) {
      throw new Error(`khalil_workout_session_lookup_failed: ${sessErr.message}`);
    }
    if (!sess || sess.user_id !== userId) {
      return { status: "rejected" as const, reason: "not_owner" as const };
    }
    if (sess.closed_at) {
      return { status: "rejected" as const, reason: "session_closed" as const };
    }

    const { error } = await supabase.from("khalil_workout_set").insert({
      user_id: userId,
      session_id: data.sessionId,
      exercise_slug: data.exerciseSlug,
      set_index: data.setIndex,
      reps: data.reps,
      weight_kg: data.weightKg,
      rpe: data.rpe ?? null,
      is_correction: data.isCorrection,
      corrects_set_id: data.correctsSetId ?? null,
      client_event_id: data.clientEventId,
    });

    if (error) {
      const outcome = classifyWorkoutInsertError(error);
      if (outcome === "replay_duplicate") {
        return { status: "duplicate" as const };
      }
      throw new Error(`khalil_workout_set_insert_failed: ${error.message}`);
    }

    return { status: "ok" as const };
  });
