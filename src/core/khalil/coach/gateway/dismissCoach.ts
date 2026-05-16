/**
 * Khalil — Coach dismiss gateway (P2.6 §8C).
 *
 * Idempotent. Replays on terminal proposals are no-ops. Audit row
 * emitted for every accepted dismissal.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { dismissCoachInputSchema } from "../schemas";

export const dismissCoachFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.COACH_DISMISS),
  ])
  .inputValidator((input) => dismissCoachInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: readErr } = await supabase
      .from("khalil_coach_proposal")
      .select("id,user_id,status")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (readErr) {
      throw new Error(`khalil_coach_proposal_read_failed: ${readErr.message}`);
    }
    if (!row || row.user_id !== userId) {
      return { status: "rejected" as const, reason: "not_found" as const };
    }
    if (row.status !== "pending") {
      return { status: "duplicate" as const, finalStatus: row.status };
    }

    const { error: updErr } = await supabase
      .from("khalil_coach_proposal")
      .update({ status: "dismissed" })
      .eq("id", row.id)
      .eq("status", "pending");
    if (updErr) {
      throw new Error(`khalil_coach_proposal_dismiss_failed: ${updErr.message}`);
    }

    await supabase.from("khalil_coach_audit").insert({
      proposal_id: row.id,
      user_id: userId,
      action: "dismissed",
      meta: { clientEventId: data.clientEventId },
    });

    return { status: "ok" as const };
  });
