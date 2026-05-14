import { useEffect, useState } from "react";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";
import { isFrequencyActive } from "@/core/engine/offers/frequency";
import type { StorefrontRail } from "../types/rail";

const isLive = (r: StorefrontRail, now: Date): boolean => {
  const ms = now.getTime();
  if (r.starts_at && new Date(r.starts_at).getTime() > ms) return false;
  if (r.ends_at && new Date(r.ends_at).getTime() <= ms) return false;
  if (!isFrequencyActive(r.frequency_tag ?? "NONE", now)) return false;
  return true;
};

export const useOffersRails = () => {
  const [rails, setRails] = useState<StorefrontRail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await MarketingGateway.listActiveStorefrontRails();
      if (cancelled) return;
      const now = new Date();
      setRails((data as unknown as StorefrontRail[]).filter((r) => isLive(r, now)));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rails, loading };
};
