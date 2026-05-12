// Section Layout Manager — Storefront Projection Hook (Wave R-3 · Step 9).
// Reads the published `mobile_home_layout_v1` document via the public
// gateway and projects it into three zone-specific ViewModels. Returns a
// `canEdit` flag derived from the `layout.edit` capability so editor
// affordances can light up in-place (Clay-like Live Editor foundation).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPublicLayoutFn,
  DEFAULT_MOBILE_HOME_LAYOUT,
} from "@/lib/section-manager.functions";
import type { LayoutBlock, MobileHomeLayoutV1 } from "@/lib/section-manager.types";
import { useCapability } from "@/hooks/useCapability";

export interface MobileHomeLayoutVM {
  homeBlocks: LayoutBlock[];
  storyBlocks: LayoutBlock[];
  gridBlocks: LayoutBlock[];
  updatedAt: string;
  loading: boolean;
  canEdit: boolean;
}

const HOUR_MS = 60 * 60 * 1000;

export function useMobileHomeLayout(): MobileHomeLayoutVM {
  const fetchLayout = useServerFn(getPublicLayoutFn);
  const { allowed: canEdit } = useCapability("layout.edit");

  const { data, isLoading } = useQuery<MobileHomeLayoutV1>({
    queryKey: ["mobile_home_layout_v1"],
    queryFn: () => fetchLayout(),
    staleTime: HOUR_MS,
    gcTime: 24 * HOUR_MS,
  });

  const doc = data ?? DEFAULT_MOBILE_HOME_LAYOUT;

  return useMemo<MobileHomeLayoutVM>(() => {
    const active = doc.blocks.filter((b) => b.is_active);

    const homeBlocks = active
      .filter((b) => b.display_in_home_feed)
      .slice()
      .sort((a, b) => {
        const ao = a.zone_overrides?.home_feed?.sort_order ?? a.sort_order;
        const bo = b.zone_overrides?.home_feed?.sort_order ?? b.sort_order;
        return ao - bo;
      });

    const storyBlocks = active
      .filter((b) => b.display_in_stories)
      .slice()
      .sort((a, b) => {
        const ao = a.zone_overrides?.stories?.sort_order ?? a.sort_order;
        const bo = b.zone_overrides?.stories?.sort_order ?? b.sort_order;
        return ao - bo;
      });

    const gridBlocks = active
      .filter((b) => b.display_in_grid)
      .slice()
      .sort((a, b) => {
        const ao = a.zone_overrides?.grid?.sort_order ?? a.sort_order;
        const bo = b.zone_overrides?.grid?.sort_order ?? b.sort_order;
        return ao - bo;
      });

    return {
      homeBlocks,
      storyBlocks,
      gridBlocks,
      updatedAt: doc.updated_at,
      loading: isLoading,
      canEdit,
    };
  }, [doc, isLoading, canEdit]);
}
