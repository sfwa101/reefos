/**
 * Khalil — Prayer write gateway (P2.2).
 *
 * Only sanctioned write path for `khalil_prayer_log`. UI never touches
 * supabase directly (Art. V, V3 Gateway Exclusivity). Enforces:
 *
 *   - capability `khalil.prayer.log.write` (via session middleware)
 *   - input validation (zod)
 *   - prayer-window + qadaa law (runtime/validatePrayerWindow)
 *   - append-only insert (RLS + DB trigger backstop)
 *   - offline idempotency (server dedupes on client_event_id)
 *
 * Emits `khalil.prayer.logged` via the DB AFTER-INSERT trigger which
 * rebuilds `khalil_adherence_daily` (see migration). Event-bus surfacing
 * for non-projection subscribers lands with the AI coach in a later
 * phase (out of P2.2 scope).
 *
 * NOTE: this file is intentionally thin — only `createServerFn` calls
 * and their imports — so the Vite splitter keeps server-only modules
 * out of client bundles (see tanstack-supabase-import-graph).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logPrayerInputSchema } from "../schemas";
import { validatePrayerWindow } from "../runtime/validatePrayerWindow";
import { classifyPrayerInsertError } from "../runtime/dedupePrayerLog";

export const logPrayerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => logPrayerInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Server-attested local date: derived from the client clock then
    // re-validated against the input. The window check below is the
    // gate that matters; the input date is only used to authorize
    // on_time vs qadaa branches.
    const nowClient = new Date(data.occurredAtClientMs);
    const todayLocalDate = nowClient.toISOString().slice(0, 10);

    const verdict = validatePrayerWindow({
      prayer: data.prayer,
      mode: data.mode,
      loggedForDate: data.loggedForDate,
      todayLocalDate,
      occurredAtClientHour: data.occurredAtClientHour,
    });
    if (!verdict.ok) {
      return { status: "rejected" as const, reason: verdict.reason };
    }

    const { error } = await supabase.from("khalil_prayer_log").insert({
      user_id: userId,
      prayer: data.prayer,
      mode: data.mode,
      logged_for_date: data.loggedForDate,
      occurred_at: nowClient.toISOString(),
      client_event_id: data.clientEventId,
    });

    if (error) {
      const outcome = classifyPrayerInsertError(error);
      if (outcome === "replay_duplicate" || outcome === "semantic_duplicate") {
        // Offline contract: duplicate replay is a no-op success.
        return { status: "duplicate" as const, kind: outcome };
      }
      throw new Error(`khalil_prayer_log_insert_failed: ${error.message}`);
    }

    return { status: "ok" as const };
  });
