/**
 * useSduiLayout — fetches the active version's blocks for a given slug.
 *
 * Phase U: migrated to React Query for cache+hydration coherency.
 * staleTime 5min / gcTime 30min — matches Salsabil OS Edge persister whitelist.
 * Zod parsing is memoized to avoid re-validating on every render.
 *
 * Anonymous-safe (RLS allows public read of published versions).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseBlocks, type SduiBlock } from "../engine/schemas";
import { HakimGenerativeOverlay } from "@/core-os/hakim-ai/generative/HakimGenerativeOverlay";

type State = {
  blocks: SduiBlock[];
  loading: boolean;
  error: string | null;
};

async function fetchSduiBlocks(slug: string): Promise<unknown> {
  const { data: layout, error: e1 } = await supabase
    .from("sdui_layouts")
    .select("id, active_version_id")
    .eq("slug", slug)
    .maybeSingle();

  if (e1) throw e1;
  if (!layout?.active_version_id) return null;

  const { data: version, error: e2 } = await supabase
    .from("sdui_layout_versions")
    .select("blocks")
    .eq("id", layout.active_version_id)
    .maybeSingle();

  if (e2) throw e2;
  return version?.blocks ?? null;
}

export function useSduiLayout(slug: string): State {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sdui_layouts", slug],
    queryFn: () => fetchSduiBlocks(slug),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Realtime cache invalidation — admin edits to the active layout flow live.
  useEffect(() => {
    const channel = supabase
      .channel(`sdui-updates-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sdui_layouts",
          filter: `slug=eq.${slug}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["sdui_layouts", slug] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [slug, queryClient]);

  // Subscribe to Hakim's transient overlay so re-orderings cause a re-render
  // WITHOUT touching the persisted query cache.
  const [overlayTick, setOverlayTick] = useState(0);
  useEffect(
    () => HakimGenerativeOverlay.subscribe(() => setOverlayTick((t) => t + 1)),
    [],
  );

  const blocks = useMemo<SduiBlock[]>(() => {
    if (!query.data) return [];
    // 1. Try the augmented payload first.
    try {
      const augmented = HakimGenerativeOverlay.applyToLayout(query.data, slug);
      const parsed = parseBlocks(augmented);
      if (parsed.length > 0) return parsed;
    } catch {
      /* fall through to stable layout */
    }
    // 2. Fallback: original payload (Zod safety guarantee).
    return parseBlocks(query.data);
    // overlayTick triggers recompute when intent scores change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, slug, overlayTick]);

  return {
    blocks,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
