/**
 * Reef Al Madina scope adapter for the Universal Omni-Search.
 * Searches the products catalog by Arabic/English name.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OmniScope, OmniHit } from "../SearchAtom";
// Phase 15.1 — products/categories tables dropped; legacy admin/POS callsites use a typed-erased alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __sb: any = supabase;

export const reefScope: OmniScope = {
  appId: "reef",
  label: "ريف",
  async fetch(query, signal): Promise<OmniHit[]> {
    if (signal.aborted) return [];
    const { data } = await __sb
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
