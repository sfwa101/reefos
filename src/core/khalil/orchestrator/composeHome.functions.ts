/**
 * Khalil — Home compose gateway (server fn, P2.4).
 *
 * Reads server-truth recovery state + adherence summary then defers to
 * the pure `composeKhalilHome` resolver. UI sees a descriptor tree only;
 * all ordering + visibility decisions are server-owned (Art. VIII).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  composeKhalilHome,
  type KhalilHomeContext,
} from "./composeHome";
import type { RecoveryMode } from "../recovery/schemas";

function bucketTimeOfDay(d: Date): KhalilHomeContext["timeOfDay"] {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 7) return "fajr";
  if (h < 11) return "morning";
  if (h < 14) return "midday";
  if (h < 17) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

export const composeKhalilHomeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const now = new Date();
    const localDate = now.toISOString().slice(0, 10);

    const [{ data: recoveryRow }, { data: adherenceRow }] = await Promise.all([
      supabase
        .from("khalil_recovery_state")
        .select("current_state")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("khalil_adherence_daily")
        .select("combined_score")
        .eq("user_id", userId)
        .eq("for_date", localDate)
        .maybeSingle(),
    ]);

    const recovery: RecoveryMode =
      (recoveryRow?.current_state as RecoveryMode | undefined) ?? "off";

    const combinedScore = Number(
      (adherenceRow as { combined_score?: number } | null)?.combined_score ?? 0,
    );

    const descriptor = composeKhalilHome({
      userId,
      localDate,
      timeOfDay: bucketTimeOfDay(now),
      recovery,
      capabilities: new Set<string>(),
      adherence: {
        combinedScore: Number.isFinite(combinedScore) ? combinedScore : 0,
        hasActiveHabits: false,
      },
    });

    // Plain JSON transport — client re-casts to RenderDescriptor.
    return { descriptor: JSON.parse(JSON.stringify(descriptor)) as Record<string, never> };
  });
