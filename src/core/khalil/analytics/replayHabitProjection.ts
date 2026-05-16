/**
 * Khalil — Habit projection replay job (P2.3).
 *
 * Admin/maintenance entrypoint to rebuild `khalil_adherence_daily` from
 * the append-only `khalil_habit_completion`. Drift correction is replay,
 * not patching (Art. IV, Anti-pattern 07).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../capabilities";
import { z } from "zod";
import { isoDateSchema } from "../prayer/schemas";

const replayInputSchema = z.object({
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
});

export const replayHabitProjectionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.ANALYTICS_PRIVATE_READ),
  ])
  .inputValidator((input) => replayInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: rows, error } = await supabase
      .from("khalil_habit_completion")
      .select("date")
      .gte("date", data.fromDate)
      .lte("date", data.toDate);
    if (error) {
      throw new Error(`khalil_habit_replay_scan_failed: ${error.message}`);
    }
    const days = Array.from(new Set((rows ?? []).map((r) => r.date as string)));
    for (const date of days) {
      const { error: rpcErr } = await supabase.rpc(
        "khalil_recompute_adherence",
        { p_user_id: userId, p_date: date },
      );
      if (rpcErr) {
        throw new Error(
          `khalil_recompute_adherence_failed: ${date}: ${rpcErr.message}`,
        );
      }
    }
    return { replayed: days.length, days };
  });
