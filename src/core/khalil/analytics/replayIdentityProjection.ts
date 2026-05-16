/**
 * Khalil — Identity projection replay (P2.5).
 *
 * Server-only. Rebuilds `khalil_identity_state` from the
 * `khalil_adherence_daily` projection by re-invoking the SECURITY
 * DEFINER SQL function. Replay is REQUIRED to be deterministic and
 * produce the exact current level (P2.5 §12).
 *
 * Does NOT touch `khalil_identity_event` — that table is append-only
 * and represents historical transitions emitted as side-effects of
 * recomputation. See `rebuildIdentityEvents()` (admin-only) for a
 * full historical replay that re-folds events from adherence days.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../capabilities";

export const rebuildIdentityProjectionFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.IDENTITY_RECOMPUTE),
  ])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.rpc("khalil_recompute_identity", {
      p_user_id: userId,
    });
    if (error) {
      throw new Error(`khalil_identity_replay_failed: ${error.message}`);
    }
    return { ok: true as const, userId };
  });

/**
 * Historical event-log replay. Walks adherence days in order, computes
 * the level at each step using the pure engine, and returns the derived
 * transition sequence. Read-only — does NOT mutate the event log
 * (that would violate append-only). Use this to verify the existing
 * event log matches deterministic replay.
 */
import {
  computeIdentity,
  type AdherenceDay,
} from "../identity/runtime/engine";
import type { KhalilIdentityLevel } from "../identity/runtime/config";

export const rebuildIdentityEventsFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.IDENTITY_RECOMPUTE),
  ])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: days, error } = await supabase
      .from("khalil_adherence_daily")
      .select("for_date,combined_score")
      .eq("user_id", userId)
      .order("for_date", { ascending: true });
    if (error) {
      throw new Error(`khalil_identity_events_replay_scan_failed: ${error.message}`);
    }

    const all: AdherenceDay[] = (days ?? []).map((d) => ({
      date: d.for_date as string,
      combinedScore: Number(d.combined_score ?? 0),
    }));

    interface DerivedTransition {
      date: string;
      from: KhalilIdentityLevel;
      to: KhalilIdentityLevel;
      score: number;
    }

    const transitions: DerivedTransition[] = [];
    let prev: KhalilIdentityLevel = "seed";

    for (let i = 0; i < all.length; i++) {
      const upto = all.slice(0, i + 1);
      const today = upto[upto.length - 1].date;
      // Recovery folding is approximate in pure replay (no historical
      // recovery state stream yet) → treat as "off" for derivation.
      const result = computeIdentity({
        days: upto,
        today,
        recovery: "off",
        previousLevel: prev,
      });
      if (result.transitioned) {
        transitions.push({
          date: today,
          from: prev,
          to: result.level,
          score: result.score,
        });
        prev = result.level;
      }
    }

    return { ok: true as const, derived: transitions };
  });
