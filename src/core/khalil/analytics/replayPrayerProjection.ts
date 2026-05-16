/**
 * Khalil — Prayer projection replay job (P2.2).
 *
 * Admin/maintenance entrypoint to rebuild `khalil_adherence_daily` from
 * the append-only `khalil_prayer_log`. Drift correction is replay, not
 * patching (Art. IV, Anti-pattern 07).
 *
 * P2.2 implementation: thin wrapper around `khalil_recompute_adherence`
 * SQL function which is itself idempotent (full recompute per day).
 * Wired as a server fn so it can be triggered via admin tooling later
 * without UI ever touching Supabase.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isoDateSchema } from "../prayer/schemas";

const replayInputSchema = z.object({
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
});

export const replayPrayerProjectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => replayInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Scope replay to caller's own days. Cross-user replay is an admin
    // operation (out of P2.2 scope) and will require a separate
    // capability + service-role path.
    const { data: distinctDays, error } = await supabase
      .from("khalil_prayer_log")
      .select("logged_for_date")
      .gte("logged_for_date", data.fromDate)
      .lte("logged_for_date", data.toDate);

    if (error) {
      throw new Error(`khalil_prayer_replay_scan_failed: ${error.message}`);
    }

    const uniqueDays = Array.from(
      new Set((distinctDays ?? []).map((r) => r.logged_for_date as string)),
    );

    // The `khalil_recompute_adherence` SQL fn is SECURITY DEFINER and
    // takes (user_id, date). Caller can only target their own user_id;
    // any other path is blocked by RLS on the read above + by the
    // capability gate (out-of-scope cross-user replay is rejected).
    for (const date of uniqueDays) {
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

    return { replayed: uniqueDays.length, days: uniqueDays };
  });
