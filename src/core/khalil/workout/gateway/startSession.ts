/**
 * Khalil — Workout startSession gateway (P2.7).
 *
 * Enforces single-open-session invariant via the partial unique index
 * `khalil_workout_session_one_open_per_user`. If the index rejects, we
 * auto-close any stale (>24h) open session and retry.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { startSessionInputSchema } from "../schemas";
import { classifyWorkoutInsertError } from "../runtime/dedupeWorkout";
import { isSessionStale } from "../runtime/staleSession";

export const startWorkoutSessionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WORKOUT_SESSION_WRITE),
  ])
  .inputValidator((input) => startSessionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Look for an existing open session; auto-close if stale.
    const { data: existing, error: existErr } = await supabase
      .from("khalil_workout_session")
      .select("id,started_at")
      .eq("user_id", userId)
      .is("closed_at", null)
      .maybeSingle();
    if (existErr) {
      throw new Error(`khalil_workout_open_lookup_failed: ${existErr.message}`);
    }
    if (existing) {
      if (isSessionStale(existing.started_at as string, Date.now())) {
        await supabase
          .from("khalil_workout_session")
          .update({ closed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        return {
          status: "already_open" as const,
          sessionId: existing.id as string,
        };
      }
    }

    const { data: row, error } = await supabase
      .from("khalil_workout_session")
      .insert({
        user_id: userId,
        focus: data.focus ?? null,
        notes_key: data.notesKey ?? null,
        client_event_id: data.clientEventId,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      const outcome = classifyWorkoutInsertError(error);
      if (outcome === "replay_duplicate") {
        const { data: dup } = await supabase
          .from("khalil_workout_session")
          .select("id")
          .eq("user_id", userId)
          .eq("client_event_id", data.clientEventId)
          .maybeSingle();
        return {
          status: "duplicate" as const,
          sessionId: (dup?.id as string | undefined) ?? null,
        };
      }
      throw new Error(`khalil_workout_session_insert_failed: ${error.message}`);
    }

    return { status: "ok" as const, sessionId: row?.id as string };
  });
