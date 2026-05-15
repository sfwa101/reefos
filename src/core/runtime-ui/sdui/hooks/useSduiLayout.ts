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
import { RuntimeUIGateway } from "@/core/runtime-ui/gateway/RuntimeUIGateway";
import { parseBlocks, type SduiBlock } from "../engine/schemas";
import { sanitizeAiBlocks } from "../engine/sanitizeAiBlocks";
import { workspaceQueryKey, getWorkspaceIdSync } from "@/core/identity/workspace";
import { HakimGenerativeOverlay } from "@/core/hakim-ai/generative/HakimGenerativeOverlay";
import { useSystemSetting } from "@/hooks/useSystemSettings";
import { Tracer } from "@/core/system/observability/Tracer";

/**
 * Emergency fallback block — guaranteed valid against the SDUI schema.
 * Used when the entire payload is corrupted so the user never sees
 * a blank screen (Phase 40 — Graceful Degradation).
 */
const EMERGENCY_FALLBACK: SduiBlock[] = [
  {
    type: "hero",
    id: "fallback_hero",
    props: {
      title: "جاري تحضير المحتوى",
      subtitle: "نقوم بتحديث الواجهة، حاول مجدداً خلال لحظات.",
      tone: "sand",
    },
  },
];

type State = {
  blocks: SduiBlock[];
  loading: boolean;
  error: string | null;
};

async function fetchSduiBlocks(slug: string): Promise<unknown> {
  return RuntimeUIGateway.getSduiActiveLayout(slug);
}

export function useSduiLayout(slug: string): State {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: workspaceQueryKey("sdui_layouts", slug),
    queryFn: () => fetchSduiBlocks(slug),
    enabled: getWorkspaceIdSync() !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Realtime cache invalidation — admin edits to the active layout flow live.
  useEffect(() => {
    const sub = RuntimeUIGateway.subscribeSduiLayoutUpdates(slug, () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey("sdui_layouts", slug) });
    });
    return () => sub.unsubscribe();
  }, [slug, queryClient]);

  // Subscribe to Hakim's transient overlay so re-orderings cause a re-render
  // WITHOUT touching the persisted query cache.
  const [overlayTick, setOverlayTick] = useState(0);
  useEffect(
    () => HakimGenerativeOverlay.subscribe(() => setOverlayTick((t) => t + 1)),
    [],
  );

  // Phase 38 — Sovereign Control Plane kill switch. When AI orchestration is
  // disabled, skip the generative overlay entirely and serve the static SDUI.
  const { value: aiOrchestrationEnabled } = useSystemSetting<boolean>(
    "ai_orchestration_enabled",
    true,
  );

  const blocks = useMemo<SduiBlock[]>(() => {
    if (!query.data) return [];
    // 1. Try the augmented payload first (only when AI is enabled).
    //    Phase 40 — pass through `sanitizeAiBlocks` BEFORE Zod parsing so
    //    AI-injected payloads with unsafe HTML / deep recursion / forbidden
    //    keys are silently stripped.
    if (aiOrchestrationEnabled) {
      try {
        const augmented = HakimGenerativeOverlay.applyToLayout(query.data, slug);
        const sanitized = sanitizeAiBlocks(augmented);
        const parsed = parseBlocks(sanitized);
        if (parsed.length > 0) return parsed;
      } catch {
        /* fall through to stable layout */
      }
    }
    // 2. Fallback: original DB payload (Zod safety guarantee).
    const stable = parseBlocks(query.data);
    if (stable.length > 0) return stable;
    // 3. Emergency fallback: never render an empty page when the DB
    //    payload is wholly corrupted.
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      Tracer.warn("runtime-ui", "log", { args: [`[SDUI] payload for "${slug}" produced 0 valid blocks — using emergency fallback`] });
    }
    return EMERGENCY_FALLBACK;
    // overlayTick triggers recompute when intent scores change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, slug, overlayTick, aiOrchestrationEnabled]);

  return {
    blocks,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}
