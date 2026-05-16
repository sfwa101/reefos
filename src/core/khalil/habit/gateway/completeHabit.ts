/**
 * Khalil — Habit completion write gateway (P2.3).
 *
 * Append-only. Same-day always allowed; yesterday only when recoveryMode
 * ≠ "off" (resolver stub). Duplicate replays are idempotent successes.
 * Projection refresh happens via DB AFTER-INSERT trigger which is
 * idempotent on (user_id, date). Application-bus subscriber lands with
 * the AI coach phase.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { completeHabitInputSchema } from "../schemas";
import { validateCompleteHabit } from "../runtime/validateCompleteHabit";
import { classifyHabitInsertError } from "../runtime/dedupeHabitCompletion";

export const completeHabitFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.HABIT_COMPLETE_WRITE),
  ])
  .inputValidator((input) => completeHabitInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const verdict = validateCompleteHabit(data);
    if (!verdict.ok) {
      return { status: "rejected" as const, reason: verdict.reason };
    }

    // Ownership backstop: habit must belong to caller and not be archived.
    const { data: def, error: defErr } = await supabase
      .from("khalil_habit_definition")
      .select("id,archived_at,user_id")
      .eq("id", data.habitId)
      .maybeSingle();
    if (defErr) {
      throw new Error(`khalil_habit_lookup_failed: ${defErr.message}`);
    }
    if (!def || def.user_id !== userId) {
      return { status: "rejected" as const, reason: "not_owner" as const };
    }
    if (def.archived_at) {
      return { status: "rejected" as const, reason: "archived" as const };
    }

    const { error } = await supabase.from("khalil_habit_completion").insert({
      user_id: userId,
      habit_id: data.habitId,
      date: data.date,
      partial: data.partial,
      mode: data.mode,
      client_event_id: data.clientEventId,
    });

    if (error) {
      const outcome = classifyHabitInsertError(error);
      if (outcome === "replay_duplicate" || outcome === "semantic_duplicate") {
        return { status: "duplicate" as const, kind: outcome };
      }
      throw new Error(`khalil_habit_completion_insert_failed: ${error.message}`);
    }

    return { status: "ok" as const };
  });
