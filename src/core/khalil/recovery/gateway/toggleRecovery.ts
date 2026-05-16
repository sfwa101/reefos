/**
 * Khalil — Recovery toggle write gateway (P2.4).
 *
 * Only sanctioned path to change recovery mode. Enforces:
 *   - capability `khalil.recovery.toggle.write`
 *   - input validation (zod)
 *   - state-machine law (validateRecoveryTransition)
 *   - append-only insert (RLS + DB trigger backstop)
 *   - offline idempotency (server dedupes on client_event_id)
 *
 * Emits `khalil.recovery.changed` via the DB AFTER-INSERT trigger which
 * refreshes `khalil_recovery_state`. External subscribers (analytics,
 * future coach hook, audit) are wired through the same projection; they
 * stay idempotent by reading the projection, never the trigger payload.
 *
 * Thin file: only createServerFn + imports (see logPrayer.ts header).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { toggleRecoveryInputSchema, type RecoveryMode } from "../schemas";
import { validateRecoveryTransition } from "../runtime/validateRecoveryTransition";

export const toggleRecoveryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireKhalilCapability(KHALIL_CAP.RECOVERY_TOGGLE_WRITE)])
  .inputValidator((input) => toggleRecoveryInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Read current projection (server-truth). Default to `off` when no
    // row exists yet.
    const { data: stateRow, error: stateErr } = await supabase
      .from("khalil_recovery_state")
      .select("current_state")
      .eq("user_id", userId)
      .maybeSingle();
    if (stateErr) {
      throw new Error(`khalil_recovery_state_read_failed: ${stateErr.message}`);
    }
    const from: RecoveryMode = (stateRow?.current_state as RecoveryMode) ?? "off";

    const verdict = validateRecoveryTransition({
      from,
      to: data.toState,
      reason: data.reason ?? null,
    });
    if (!verdict.ok) {
      return { status: "rejected" as const, reason: verdict.reason, from };
    }

    const { error: insErr } = await supabase.from("khalil_recovery_event").insert({
      user_id: userId,
      from_state: from,
      to_state: data.toState,
      reason: data.reason ?? null,
      client_event_id: data.clientEventId,
    });

    if (insErr) {
      const msg = insErr.message ?? "";
      if (msg.includes("khalil_recovery_event_client_event_unique")) {
        // Offline replay: duplicate intent — idempotent no-op.
        return { status: "duplicate" as const, from, to: data.toState };
      }
      throw new Error(`khalil_recovery_event_insert_failed: ${msg}`);
    }

    return { status: "ok" as const, from, to: data.toState };
  });
