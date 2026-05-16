/**
 * Khalil — Workout closeSession gateway (P2.7).
 *
 * Idempotent: closing an already-closed session is a no-op success.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { closeSessionInputSchema } from "../schemas";

export const closeWorkoutSessionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WORKOUT_SESSION_WRITE),
  ])
  .inputValidator((input) => closeSessionInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

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
      return { status: "duplicate" as const };
    }

    const { error } = await supabase
      .from("khalil_workout_session")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", data.sessionId);
    if (error) {
      throw new Error(`khalil_workout_session_close_failed: ${error.message}`);
    }
    return { status: "ok" as const };
  });
