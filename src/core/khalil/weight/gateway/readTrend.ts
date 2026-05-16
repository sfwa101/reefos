/**
 * Khalil — Weight read gateway (P2.7).
 *
 * Returns the projection. If the projection row is missing (no
 * measurements yet) the gateway emits a zeroed DTO.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import type { WeightTrendDTO, WeightTrendDirection } from "../schemas";

export const readWeightTrendFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.WEIGHT_READ),
  ])
  .handler(async ({ context }): Promise<WeightTrendDTO> => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("khalil_weight_projection")
      .select(
        "latest_kg,latest_for_date,avg_7d,avg_30d,avg_90d,delta_7d,delta_30d,delta_90d,trend_direction,measurements_count",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`khalil_weight_trend_read_failed: ${error.message}`);
    }
    if (!data) {
      return {
        latestKg: null,
        latestForDate: null,
        avg7d: null,
        avg30d: null,
        avg90d: null,
        delta7d: null,
        delta30d: null,
        delta90d: null,
        trendDirection: "flat",
        measurementsCount: 0,
      };
    }
    return {
      latestKg: data.latest_kg === null ? null : Number(data.latest_kg),
      latestForDate: (data.latest_for_date as string | null) ?? null,
      avg7d: data.avg_7d === null ? null : Number(data.avg_7d),
      avg30d: data.avg_30d === null ? null : Number(data.avg_30d),
      avg90d: data.avg_90d === null ? null : Number(data.avg_90d),
      delta7d: data.delta_7d === null ? null : Number(data.delta_7d),
      delta30d: data.delta_30d === null ? null : Number(data.delta_30d),
      delta90d: data.delta_90d === null ? null : Number(data.delta_90d),
      trendDirection: (data.trend_direction as WeightTrendDirection) ?? "flat",
      measurementsCount: Number(data.measurements_count ?? 0),
    };
  });
