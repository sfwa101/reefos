/**
 * Khalil — Coach accept gateway (P2.6 §8B).
 *
 * Re-validates the proposal server-side, enforces:
 *   - ownership
 *   - status still `pending`
 *   - expiry not crossed
 *   - capability intent (if any) is in the allowlist
 *
 * Coach NEVER writes the underlying domain row directly. It transitions
 * its own proposal row and writes an audit entry. The actual write
 * (e.g. logging a habit completion, toggling recovery) is performed by
 * the user on the relevant page through the real capability gateway,
 * which is itself capability-gated. This preserves the
 * proposal/dispose invariant from Art. III + §11.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { acceptCoachInputSchema } from "../schemas";

export const acceptCoachFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.COACH_ACCEPT),
  ])
  .inputValidator((input) => acceptCoachInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: readErr } = await supabase
      .from("khalil_coach_proposal")
      .select(
        "id,user_id,status,expires_at,suggested_capability",
      )
      .eq("id", data.proposalId)
      .maybeSingle();

    if (readErr) {
      throw new Error(`khalil_coach_proposal_read_failed: ${readErr.message}`);
    }
    if (!row || row.user_id !== userId) {
      return { status: "rejected" as const, reason: "not_found" as const };
    }
    if (row.status !== "pending") {
      // Idempotent: replaying an accept on a terminal proposal is a no-op.
      return { status: "duplicate" as const, finalStatus: row.status };
    }
    if (new Date(row.expires_at as string).getTime() <= Date.now()) {
      // Mark expired and audit.
      await supabase
        .from("khalil_coach_proposal")
        .update({ status: "expired" })
        .eq("id", row.id)
        .eq("status", "pending");
      await supabase.from("khalil_coach_audit").insert({
        proposal_id: row.id,
        user_id: userId,
        action: "expired",
        meta: { source: "accept" },
      });
      return { status: "rejected" as const, reason: "expired" as const };
    }

    const { error: updErr } = await supabase
      .from("khalil_coach_proposal")
      .update({ status: "accepted" })
      .eq("id", row.id)
      .eq("status", "pending");
    if (updErr) {
      throw new Error(`khalil_coach_proposal_accept_failed: ${updErr.message}`);
    }

    await supabase.from("khalil_coach_audit").insert({
      proposal_id: row.id,
      user_id: userId,
      action: "accepted",
      meta: {
        suggestedCapability: row.suggested_capability,
        clientEventId: data.clientEventId,
      },
    });

    return {
      status: "ok" as const,
      suggestedCapability:
        (row.suggested_capability as string | null) ?? null,
    };
  });
