/**
 * Khalil — Weight writeMeasurement gateway (P2.7).
 *
 * Append-only. Plausible kg range enforced server-side. Idempotent on
 * client_event_id; semantic duplicate (same date) returns `duplicate`
 * rather than overwriting.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  writeMeasurementInputSchema,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
} from "../schemas";
import { classifyWeightInsertError } from "../runtime/dedupeWeight";

export const writeWeightMeasurementFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WEIGHT_MEASUREMENT_WRITE),
  ])
  .inputValidator((input) => writeMeasurementInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.weightKg < WEIGHT_MIN_KG || data.weightKg > WEIGHT_MAX_KG) {
      return { status: "rejected" as const, reason: "implausible_weight" as const };
    }

    const { error } = await supabase.from("khalil_weight_measurement").insert({
      user_id: userId,
      for_date: data.forDate,
      weight_kg: data.weightKg,
      source: data.source,
      client_event_id: data.clientEventId,
    });

    if (error) {
      const outcome = classifyWeightInsertError(error);
      if (outcome === "replay_duplicate" || outcome === "semantic_duplicate") {
        return { status: "duplicate" as const, kind: outcome };
      }
      throw new Error(`khalil_weight_insert_failed: ${error.message}`);
    }

    return { status: "ok" as const };
  });
