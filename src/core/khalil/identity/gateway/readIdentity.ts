/**
 * Khalil — Identity read gateway (P2.5).
 *
 * Owner-scoped. UI receives a fully-projected DTO; it NEVER recomputes
 * the level client-side. RLS ensures cross-user reads return zero rows;
 * the capability gate ensures the call is intentional.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  LEVEL_INDEX,
  LEVEL_THRESHOLDS,
  type KhalilIdentityLevel,
} from "../runtime/config";
import type { IdentityStateDTO } from "../schemas";

function nextThresholdFor(level: KhalilIdentityLevel) {
  const idx = LEVEL_INDEX[level];
  const next = LEVEL_THRESHOLDS.find((t) => LEVEL_INDEX[t.level] === idx + 1);
  return next ?? null;
}

export const readIdentityFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireKhalilCapability(KHALIL_CAP.IDENTITY_READ)])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("khalil_identity_state")
      .select(
        "current_level,current_score,window_30d,window_90d,window_180d,observed_days,last_computed_at,updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`khalil_identity_state_read_failed: ${error.message}`);
    }

    const level: KhalilIdentityLevel =
      (row?.current_level as KhalilIdentityLevel | undefined) ?? "seed";

    const state: IdentityStateDTO = {
      currentLevel: level,
      currentScore: Number(row?.current_score ?? 0),
      windows: {
        window30d: Number(row?.window_30d ?? 0),
        window90d: Number(row?.window_90d ?? 0),
        window180d: Number(row?.window_180d ?? 0),
        observedDays: Number(row?.observed_days ?? 0),
      },
      nextThreshold: nextThresholdFor(level),
      lastComputedAt: (row?.last_computed_at as string | undefined) ?? new Date().toISOString(),
      updatedAt: (row?.updated_at as string | undefined) ?? new Date().toISOString(),
    };

    return { state };
  });
