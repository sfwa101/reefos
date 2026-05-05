/**
 * useSduiLayout — fetches the active version's blocks for a given slug.
 *
 * Strategy:
 *   1. Read `sdui_layouts` by slug + join active version.
 *   2. Validate the JSONB blocks via Zod (Graceful Degradation).
 *   3. Return parsed blocks + loading + error.
 *
 * Anonymous-safe (RLS allows public read of published versions).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseBlocks, type SduiBlock } from "../engine/schemas";

type State = {
  blocks: SduiBlock[];
  loading: boolean;
  error: string | null;
};

export function useSduiLayout(slug: string): State {
  const [state, setState] = useState<State>({ blocks: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: layout, error: e1 } = await supabase
          .from("sdui_layouts")
          .select("id, active_version_id")
          .eq("slug", slug)
          .maybeSingle();

        if (cancelled) return;
        if (e1) throw e1;
        if (!layout?.active_version_id) {
          setState({ blocks: [], loading: false, error: null });
          return;
        }

        const { data: version, error: e2 } = await supabase
          .from("sdui_layout_versions")
          .select("blocks")
          .eq("id", layout.active_version_id)
          .maybeSingle();

        if (cancelled) return;
        if (e2) throw e2;

        const blocks = parseBlocks(version?.blocks);
        setState({ blocks, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          blocks: [],
          loading: false,
          error: err instanceof Error ? err.message : "SDUI fetch failed",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
