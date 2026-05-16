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
import type { KhalilIdentityLevel } from "../identity/runtime/config";

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

    const [
      { data: recoveryRow },
      { data: adherenceRow },
      { data: identityRow },
      { data: coachRow },
      { data: intelRow },
    ] = await Promise.all([
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
      supabase
        .from("khalil_identity_state")
        .select("current_level")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("khalil_coach_proposal")
        .select("id,kind")
        .eq("user_id", userId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("khalil_intelligence_snapshot")
        .select("*")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const recovery: RecoveryMode =
      (recoveryRow?.current_state as RecoveryMode | undefined) ?? "off";

    const combinedScore = Number(
      (adherenceRow as { combined_score?: number } | null)?.combined_score ?? 0,
    );

    const identityLevel: KhalilIdentityLevel =
      ((identityRow as { current_level?: string } | null)?.current_level as
        | KhalilIdentityLevel
        | undefined) ?? "seed";

    const intelligence = intelRow
      ? {
          generatedAt: (intelRow as any).generated_at as string,
          replayVersion: Number((intelRow as any).replay_version ?? 1),
          identityLevel: (intelRow as any).identity_level as KhalilIdentityLevel,
          recovery: (intelRow as any).recovery_mode as RecoveryMode,
          signals: ((intelRow as any).signals ?? []) as never,
          priorities: ((intelRow as any).priorities ?? []) as never,
          nudges: ((intelRow as any).nudges ?? []) as never,
          weeklyFocus: ((intelRow as any).weekly_focus ?? {}) as never,
          inputsDigest: (intelRow as any).inputs_digest as string,
        }
      : null;

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
      identityLevel,
      pendingCoachProposal: coachRow
        ? { id: coachRow.id as string, kind: coachRow.kind as string }
        : null,
      intelligence,
    });

    // Plain JSON transport — client re-casts to RenderDescriptor.
    return { descriptor: JSON.parse(JSON.stringify(descriptor)) as Record<string, never> };
  });
