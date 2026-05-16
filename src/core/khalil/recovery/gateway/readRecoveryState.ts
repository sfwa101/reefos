/**
 * Khalil — Recovery read gateway (P2.4).
 *
 * Returns the current recovery state DTO + the most recent events for
 * audit-sensitive UX on `/khalil/recovery`. RLS scopes rows to the
 * caller; capability `khalil.recovery.read` gates the call.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import type {
  RecoveryEventRow,
  RecoveryMode,
  RecoveryStateDTO,
} from "../schemas";

export const readRecoveryStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireKhalilCapability(KHALIL_CAP.RECOVERY_READ)])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: stateRow, error: stateErr }, { data: eventRows, error: eventErr }] =
      await Promise.all([
        supabase
          .from("khalil_recovery_state")
          .select("current_state,entered_at,updated_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("khalil_recovery_event")
          .select("id,from_state,to_state,reason,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    if (stateErr) {
      throw new Error(`khalil_recovery_state_read_failed: ${stateErr.message}`);
    }
    if (eventErr) {
      throw new Error(`khalil_recovery_event_read_failed: ${eventErr.message}`);
    }

    const nowIso = new Date().toISOString();
    const state: RecoveryStateDTO = stateRow
      ? {
          currentState: stateRow.current_state as RecoveryMode,
          enteredAt: stateRow.entered_at as string,
          updatedAt: stateRow.updated_at as string,
        }
      : { currentState: "off", enteredAt: nowIso, updatedAt: nowIso };

    const events: RecoveryEventRow[] = (eventRows ?? []).map((r) => ({
      id: r.id as string,
      fromState: r.from_state as RecoveryMode,
      toState: r.to_state as RecoveryMode,
      reason: (r.reason as string | null) ?? null,
      createdAt: r.created_at as string,
    }));

    return { state, events };
  });
