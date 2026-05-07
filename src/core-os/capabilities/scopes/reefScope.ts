/**
 * Reef Al Madina scope adapter for the Universal Omni-Search.
 * Searches the products catalog by Arabic/English name.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OmniScope, OmniHit } from "../SearchAtom";

export const reefScope: OmniScope = {
  appId: "reef",
  label: "ريف",
  async fetch(query, signal): Promise<OmniHit[]> {
    if (signal.aborted) return [];
    const { data } = await supabase
      .from("products")
      .select("id,name,category")
      .ilike("name", `%${query}%`)
      .limit(8);
    if (signal.aborted || !data) return [];
    return data.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.category ?? undefined,
      to: `/product/${p.id}`,
      appId: "reef",
    }));
  },
};
