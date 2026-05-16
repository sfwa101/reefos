/**
 * Khalil — Identity recompute gateway (P2.5).
 *
 * Owner-only. Calls the SECURITY DEFINER SQL fn
 * `khalil_recompute_identity(p_user_id)` scoped to the authenticated
 * caller — there is no admin override path (Art. III, p1-capability-ownership).
 *
 * Every call is audited: we emit `khalil.identity.recomputed` and the
 * SQL fn itself appends a `khalil_identity_event` row iff the level
 * transitioned. Idempotent: same inputs → same projection.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { recomputeIdentityInputSchema } from "../schemas";

export const recomputeIdentityFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.IDENTITY_RECOMPUTE),
  ])
  .inputValidator((input) => recomputeIdentityInputSchema.parse(input ?? {}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // SECURITY DEFINER fn is owner-scoped via p_user_id; caller can
    // only pass their own userId from the validated auth context.
    const { error } = await supabase.rpc("khalil_recompute_identity", {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`khalil_identity_recompute_failed: ${error.message}`);
    }

    // Read back the projection so the caller can refresh without a
    // second round-trip.
    const { data: row, error: readErr } = await supabase
      .from("khalil_identity_state")
      .select("current_level,current_score,last_computed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) {
      throw new Error(`khalil_identity_state_read_failed: ${readErr.message}`);
    }

    return {
      ok: true as const,
      level: (row?.current_level as string | undefined) ?? "seed",
      score: Number(row?.current_score ?? 0),
      computedAt: (row?.last_computed_at as string | undefined) ?? new Date().toISOString(),
    };
  });
