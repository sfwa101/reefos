/**
 * Phase 21 — Sovereign Spatio-Temporal Offers Resolver.
 *
 * Pulls every active row from `offers_matrix`, then applies four-dimensional
 * filtering (Time × Space × Identity × Amanah) on the client to morph the
 * Offers surface per user. Modesty Protocol (gender_lock) is enforced here
 * as a defence-in-depth over RLS public-read.
 */
import { useEffect, useMemo, useState } from "react";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";
import { useAuth } from "@/context/AuthContext";
import type {
  OfferMatrixRow,
  UserContext,
} from "../types/offerMatrix";
import { Tracer } from "@/core/system/observability/Tracer";

const TIER_RANK: Record<UserContext["tier"], number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
};

const matchesTemporal = (row: OfferMatrixRow, now: Date): boolean => {
  const t = row.temporal_context ?? {};
  const ms = now.getTime();
  if (t.starts_at && new Date(t.starts_at).getTime() > ms) return false;
  if (t.ends_at && new Date(t.ends_at).getTime() <= ms) return false;
  const hour = now.getHours();
  if (typeof t.start_hour === "number" && hour < t.start_hour) return false;
  if (typeof t.end_hour === "number" && hour >= t.end_hour) return false;
  if (Array.isArray(t.weekdays) && t.weekdays.length > 0 && !t.weekdays.includes(now.getDay()))
    return false;
  return true;
};

const matchesGeo = (row: OfferMatrixRow, govCode: string | null): boolean => {
  const g = row.geo_context ?? {};
  if (Array.isArray(g.governorate_codes) && g.governorate_codes.length > 0) {
    if (!govCode) return false;
    if (!g.governorate_codes.includes(govCode)) return false;
  }
  return true;
};

const matchesPersona = (row: OfferMatrixRow, ctx: UserContext): boolean => {
  const p = row.persona_context ?? {};
  // Modesty Protocol — Doctrine 9.4
  if (p.gender_lock && p.gender_lock !== ctx.gender) return false;
  if (p.kyc_only && !ctx.isKycVerified) return false;
  if (p.required_tier && TIER_RANK[ctx.tier] < TIER_RANK[p.required_tier]) return false;
  if (typeof p.min_amanah_score === "number" && ctx.amanahScore < p.min_amanah_score)
    return false;
  return true;
};

const computeBoost = (row: OfferMatrixRow): number => {
  let boost = 0;
  for (const rule of row.logic_weaver_rules ?? []) {
    if (rule.then === "boost" && typeof rule.weight === "number") boost += rule.weight;
  }
  return boost;
};

export const useSpatioTemporalOffers = () => {
  const { profile } = useAuth();
  const [rawRows, setRawRows] = useState<OfferMatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await MarketingGateway.listActiveOffersMatrix();
      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        Tracer.warn("offers", "offers_matrix_load_error", { args: ["[offers_matrix] load error", error.message] });
      }
      setRawRows((data ?? []) as unknown as OfferMatrixRow[]);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const userContext: UserContext = useMemo(
    () => ({
      gender: (profile?.gender as "male" | "female" | null) ?? null,
      isKycVerified: !!profile?.is_kyc_verified,
      tier: "bronze", // TODO Phase 21.2 — bind to wallet tier
      governorate: profile?.governorate ?? null,
      amanahScore: 0, // TODO Phase 21.2 — bind to Amanah ledger
      now: new Date(),
    }),
    [profile],
  );

  const offers = useMemo(() => {
    return rawRows
      .filter((r) => matchesTemporal(r, userContext.now))
      .filter((r) => matchesGeo(r, userContext.governorate))
      .filter((r) => matchesPersona(r, userContext))
      .map((r) => ({ row: r, boost: computeBoost(r) }))
      .sort((a, b) => b.row.priority + b.boost - (a.row.priority + a.boost))
      .map((x) => x.row);
  }, [rawRows, userContext]);

  return { offers, loading, userContext };
};
