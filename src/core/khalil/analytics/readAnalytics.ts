/**
 * Khalil — Analytics read gateways (P2.7).
 *
 * All four gateways consume PROJECTIONS only — never raw event tables,
 * never cross-domain joins. UI cannot bypass projections; this is the
 * sole read surface for the insights page and home analytics blocks.
 *
 *   readAdherence()      → daily adherence rows in a window
 *   readHeatmap()        → compact day-cells for the calendar heatmap
 *   readWeightDelta()    → weight trend projection
 *   readWorkoutVolume()  → weekly workout volume projection
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../capabilities";
import { isoDateSchema } from "../prayer/schemas";
import { readWeightTrendFn } from "../weight";
import type { WeightTrendDTO } from "../weight";

export type AnalyticsWindow = "7d" | "30d" | "90d";
const ANALYTICS_WINDOWS = ["7d", "30d", "90d"] as const;

export const analyticsWindowSchema = z.enum(ANALYTICS_WINDOWS);

const windowInputSchema = z.object({
  window: analyticsWindowSchema.default("30d"),
});

function windowToDays(w: AnalyticsWindow): number {
  return w === "7d" ? 7 : w === "30d" ? 30 : 90;
}

function todayLocalIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDateIso(refIso: string, deltaDays: number): string {
  const t = Date.parse(`${refIso}T00:00:00Z`) + deltaDays * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export interface AdherenceDayDTO {
  forDate: string;
  prayerScore: number;
  habitScore: number;
  combinedScore: number;
  identityScore: number;
}

export interface AdherenceReadDTO {
  window: AnalyticsWindow;
  days: AdherenceDayDTO[];
}

export const readAdherenceFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.ANALYTICS_PRIVATE_READ),
  ])
  .inputValidator((input) => windowInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdherenceReadDTO> => {
    const { supabase, userId } = context;
    const days = windowToDays(data.window);
    const today = todayLocalIso();
    const since = shiftDateIso(today, -(days - 1));
    const { data: rows, error } = await supabase
      .from("khalil_adherence_daily")
      .select("for_date,prayer_score,habit_score,combined_score,identity_score")
      .eq("user_id", userId)
      .gte("for_date", since)
      .lte("for_date", today)
      .order("for_date", { ascending: true });
    if (error) {
      throw new Error(`khalil_adherence_read_failed: ${error.message}`);
    }
    const list: AdherenceDayDTO[] = (rows ?? []).map((r) => ({
      forDate: r.for_date as string,
      prayerScore: Number(r.prayer_score ?? 0),
      habitScore: Number(r.habit_score ?? 0),
      combinedScore: Number(r.combined_score ?? 0),
      identityScore: Number(r.identity_score ?? 0),
    }));
    return { window: data.window, days: list };
  });

export interface HeatmapCellDTO {
  forDate: string;
  /** Intensity bucket 0..4 (server-resolved). */
  bucket: 0 | 1 | 2 | 3 | 4;
  combinedScore: number;
}

export interface HeatmapReadDTO {
  window: AnalyticsWindow;
  cells: HeatmapCellDTO[];
}

function bucketize(score: number): HeatmapCellDTO["bucket"] {
  if (score <= 0) return 0;
  if (score < 0.3) return 1;
  if (score < 0.6) return 2;
  if (score < 0.85) return 3;
  return 4;
}

export const readHeatmapFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.ANALYTICS_PRIVATE_READ),
  ])
  .inputValidator((input) => windowInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<HeatmapReadDTO> => {
    const { supabase, userId } = context;
    const days = windowToDays(data.window);
    const today = todayLocalIso();
    const since = shiftDateIso(today, -(days - 1));
    const { data: rows, error } = await supabase
      .from("khalil_adherence_daily")
      .select("for_date,combined_score")
      .eq("user_id", userId)
      .gte("for_date", since)
      .lte("for_date", today)
      .order("for_date", { ascending: true });
    if (error) {
      throw new Error(`khalil_heatmap_read_failed: ${error.message}`);
    }
    const cells: HeatmapCellDTO[] = (rows ?? []).map((r) => {
      const score = Number(r.combined_score ?? 0);
      return {
        forDate: r.for_date as string,
        combinedScore: score,
        bucket: bucketize(score),
      };
    });
    return { window: data.window, cells };
  });

export type WeightDeltaDTO = WeightTrendDTO;
export const readWeightDeltaFn = readWeightTrendFn;

export interface WorkoutVolumeWeekDTO {
  isoYear: number;
  isoWeek: number;
  totalVolumeKg: number;
  totalSets: number;
  sessionsCount: number;
}

export interface WorkoutVolumeReadDTO {
  weeks: WorkoutVolumeWeekDTO[];
}

export const readWorkoutVolumeFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.ANALYTICS_PRIVATE_READ),
  ])
  .handler(async ({ context }): Promise<WorkoutVolumeReadDTO> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("khalil_workout_projection_weekly")
      .select("iso_year,iso_week,total_volume_kg,total_sets,sessions_count")
      .eq("user_id", userId)
      .order("iso_year", { ascending: true })
      .order("iso_week", { ascending: true })
      .limit(26);
    if (error) {
      throw new Error(`khalil_workout_volume_read_failed: ${error.message}`);
    }
    const weeks: WorkoutVolumeWeekDTO[] = (data ?? []).map((r) => ({
      isoYear: Number(r.iso_year),
      isoWeek: Number(r.iso_week),
      totalVolumeKg: Number(r.total_volume_kg ?? 0),
      totalSets: Number(r.total_sets ?? 0),
      sessionsCount: Number(r.sessions_count ?? 0),
    }));
    return { weeks };
  });
