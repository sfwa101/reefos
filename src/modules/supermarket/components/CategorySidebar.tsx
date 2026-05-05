// CategorySidebar — thin adapter over the universal StickyTriLayerHub
// stem cell. Behaviour is unchanged for the supermarket page; the hub
// is now reusable across every department (meat, kitchen, …).

import { memo, useMemo } from "react";
import { supermarketTaxonomy } from "@/lib/supermarketTaxonomy";
import StickyTriLayerHub, {
  type TriHubGroup,
} from "@/features/navigation/StickyTriLayerHub";
import type { SupermarketGroup } from "../types";
import { SUPERMARKET_NAV } from "../types";

interface CategorySidebarProps {
  readonly grouped: ReadonlyArray<SupermarketGroup>;
  readonly activeGroup: SupermarketGroup["group"];
  readonly activeSub: string;
  readonly visibleSubs: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly mainBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly subBarRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly onJumpGroup: (groupId: string) => void;
  readonly onJumpSub: (id: string) => void;
}

const CategorySidebarImpl = ({
  grouped,
  activeGroup,
  activeSub,
  visibleSubs,
  mainBarRef,
  subBarRef,
  onJumpGroup,
  onJumpSub,
}: CategorySidebarProps) => {
  const groups: TriHubGroup[] = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...supermarketTaxonomy, ...grouped.map((x) => x.group)].filter(
      (g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      },
    );
    return merged.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.emoji,
      hue: g.color.hue,
      tint: g.color.tint,
      enabled: grouped.some((x) => x.group.id === g.id),
    }));
  }, [grouped]);

  return (
    <StickyTriLayerHub
      topOffset={SUPERMARKET_NAV.HEADER_OFFSET + SUPERMARKET_NAV.HEADER_GAP}
      groups={groups}
      subs={visibleSubs}
      activeGroupId={activeGroup.id}
      activeSubId={activeSub}
      onJumpGroup={onJumpGroup}
      onJumpSub={onJumpSub}
      mainBarRef={mainBarRef}
      subBarRef={subBarRef}
    />
  );
};

export const CategorySidebar = memo(CategorySidebarImpl);
CategorySidebar.displayName = "CategorySidebar";
