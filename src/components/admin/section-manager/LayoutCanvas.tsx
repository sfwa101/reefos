// Section Manager — Sortable Canvas (Wave R-3 · Step 6A).
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { LayoutBlock } from "@/lib/section-manager.types";
import {
  useSectionManagerStore,
  type ZoneTab,
} from "./useSectionManagerStore";
import { BlockCard } from "./BlockCard";

function getZoneSort(b: LayoutBlock, zone: ZoneTab): number {
  if (zone === "all") return b.sort_order;
  if (zone === "stories") return b.zone_overrides?.stories?.sort_order ?? b.sort_order;
  if (zone === "grid") return b.zone_overrides?.grid?.sort_order ?? b.sort_order;
  return b.zone_overrides?.home_feed?.sort_order ?? b.sort_order;
}

function filterByZone(blocks: LayoutBlock[], zone: ZoneTab): LayoutBlock[] {
  let visible = blocks;
  if (zone === "home_feed") visible = blocks.filter((b) => b.display_in_home_feed);
  else if (zone === "stories") visible = blocks.filter((b) => b.display_in_stories);
  else if (zone === "grid") visible = blocks.filter((b) => b.display_in_grid);
  return [...visible].sort((a, b) => getZoneSort(a, zone) - getZoneSort(b, zone));
}

export function LayoutCanvas() {
  const draftDoc = useSectionManagerStore((s) => s.draftDoc);
  const activeTab = useSectionManagerStore((s) => s.activeTab);
  const reorderBlocks = useSectionManagerStore((s) => s.reorderBlocks);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const visibleBlocks = useMemo(
    () => (draftDoc ? filterByZone(draftDoc.blocks, activeTab) : []),
    [draftDoc, activeTab],
  );

  if (!draftDoc) {
    return (
      <div className="p-10 text-center">
        <p className="font-display text-[15px]">لا توجد مسودة بعد</p>
        <p className="text-[12px] text-foreground-tertiary mt-1">
          ابدأ بسحب كتلة من المكتبة على اليسار.
        </p>
      </div>
    );
  }

  if (visibleBlocks.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-[12.5px] text-foreground-tertiary">
          لا توجد كتل في هذه المنطقة بعد.
        </p>
      </div>
    );
  }

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visibleBlocks.map((b) => b.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    // Use arrayMove on visibleBlocks to compute target index, but the store handles persistence.
    arrayMove(visibleBlocks, oldIndex, newIndex);
    reorderBlocks(activeTab, oldIndex, newIndex);
  };

  const activeBlock = activeId ? visibleBlocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={visibleBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {visibleBlocks.map((b) => (
            <BlockCard key={b.id} block={b} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-90">
            <BlockCard block={activeBlock} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
