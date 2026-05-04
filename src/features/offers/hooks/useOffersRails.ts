import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StorefrontRail } from "../types/rail";

type RailsDb = {
  from(table: "storefront_rails"): {
    select(s: string): {
      eq(col: string, val: boolean): {
        order(c: string, o: { ascending: boolean }): Promise<{
          data: StorefrontRail[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

const isLive = (r: StorefrontRail, now: number): boolean => {
  if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
  if (r.ends_at && new Date(r.ends_at).getTime() <= now) return false;
  return true;
};

export const useOffersRails = () => {
  const [rails, setRails] = useState<StorefrontRail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const db = supabase as unknown as RailsDb;
      const { data } = await db
        .from("storefront_rails")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const now = Date.now();
      setRails((data ?? []).filter((r) => isLive(r, now)));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rails, loading };
};
