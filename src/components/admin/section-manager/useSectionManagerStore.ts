// Section Manager — Local Draft Store (Wave R-3 · Step 5).
// Holds the published + draft snapshots, current selection, dirty flag,
// and the canvas zone tab. No network calls live here — components are
// responsible for hydrating the store via `init()` after fetching from
// `getAppSettingsFn`, and for persisting via `upsertAppSettingFn`.
import { create } from "zustand";
import type { LayoutBlock, MobileHomeLayoutV1 } from "@/lib/section-manager.types";

export type ZoneTab = "all" | "home_feed" | "stories" | "grid";

interface SectionManagerState {
  publishedDoc: MobileHomeLayoutV1 | null;
  draftDoc: MobileHomeLayoutV1 | null;
  selectedBlockId: string | null;
  inspectingBlockId: string | null;
  dirty: boolean;
  activeTab: ZoneTab;

  init: (published: MobileHomeLayoutV1 | null, draft: MobileHomeLayoutV1 | null) => void;
  selectBlock: (id: string | null) => void;
  openInspector: (id: string) => void;
  closeInspector: () => void;
  setTab: (tab: ZoneTab) => void;
  updateBlock: (id: string, patch: Partial<LayoutBlock>) => void;
  addBlock: (block: LayoutBlock) => void;
  insertBlockAt: (index: number, block: LayoutBlock) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (zone: ZoneTab, oldIndex: number, newIndex: number) => void;
  moveBlock: (id: string, direction: "up" | "down") => void;
  markClean: (newPublished?: MobileHomeLayoutV1) => void;
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function getZoneSortKey(zone: ZoneTab): "stories" | "grid" | "home_feed" | null {
  if (zone === "all") return null;
  return zone;
}

export const useSectionManagerStore = create<SectionManagerState>((set) => ({
  publishedDoc: null,
  draftDoc: null,
  selectedBlockId: null,
  inspectingBlockId: null,
  dirty: false,
  activeTab: "all",

  init: (published, draft) =>
    set({
      publishedDoc: published,
      draftDoc: draft ?? published,
      selectedBlockId: null,
      inspectingBlockId: null,
      dirty: false,
      activeTab: "all",
    }),

  selectBlock: (id) => set({ selectedBlockId: id }),
  openInspector: (id) => set({ inspectingBlockId: id, selectedBlockId: id }),
  closeInspector: () => set({ inspectingBlockId: null }),
  setTab: (tab) => set({ activeTab: tab }),

  updateBlock: (id, patch) =>
    set((s) => {
      if (!s.draftDoc) return s;
      const blocks = s.draftDoc.blocks.map((b) =>
        b.id === id ? ({ ...b, ...patch } as LayoutBlock) : b,
      );
      return {
        draftDoc: { ...s.draftDoc, blocks, updated_at: new Date().toISOString() },
        dirty: true,
      };
    }),

  addBlock: (block) =>
    set((s) => {
      const now = new Date().toISOString();
      if (!s.draftDoc) {
        return {
          draftDoc: {
            __v: 1,
            page_key: "mobile_home",
            updated_at: now,
            updated_by: "admin",
            blocks: [{ ...block, sort_order: 0 }],
          } as MobileHomeLayoutV1,
          dirty: true,
          selectedBlockId: block.id,
        };
      }
      const nextSort = s.draftDoc.blocks.length;
      return {
        draftDoc: {
          ...s.draftDoc,
          blocks: [...s.draftDoc.blocks, { ...block, sort_order: nextSort }],
          updated_at: now,
        },
        dirty: true,
        selectedBlockId: block.id,
      };
    }),

  insertBlockAt: (index, block) =>
    set((s) => {
      const now = new Date().toISOString();
      if (!s.draftDoc) {
        return {
          draftDoc: {
            __v: 1,
            page_key: "mobile_home",
            updated_at: now,
            updated_by: "admin",
            blocks: [{ ...block, sort_order: 0 }],
          } as MobileHomeLayoutV1,
          dirty: true,
          selectedBlockId: block.id,
        };
      }
      const next = s.draftDoc.blocks.slice();
      const safeIdx = Math.max(0, Math.min(index, next.length));
      next.splice(safeIdx, 0, block);
      const renum = next.map((b, i) => ({ ...b, sort_order: i }));
      return {
        draftDoc: { ...s.draftDoc, blocks: renum, updated_at: now },
        dirty: true,
        selectedBlockId: block.id,
      };
    }),

  removeBlock: (id) =>
    set((s) => {
      if (!s.draftDoc) return s;
      const blocks = s.draftDoc.blocks
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, sort_order: i }));
      return {
        draftDoc: { ...s.draftDoc, blocks, updated_at: new Date().toISOString() },
        dirty: true,
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      };
    }),

  moveBlock: (id, direction) =>
    set((s) => {
      if (!s.draftDoc) return s;
      const blocks = s.draftDoc.blocks.slice().sort((a, b) => a.sort_order - b.sort_order);
      const idx = blocks.findIndex((b) => b.id === id);
      if (idx < 0) return s;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= blocks.length) return s;
      const [moved] = blocks.splice(idx, 1);
      blocks.splice(target, 0, moved);
      const renum = blocks.map((b, i) => ({ ...b, sort_order: i }));
      return {
        draftDoc: { ...s.draftDoc, blocks: renum, updated_at: new Date().toISOString() },
        dirty: true,
      };
    }),

  reorderBlocks: (zone, oldIndex, newIndex) =>
    set((s) => {
      if (!s.draftDoc) return s;
      const sortKey = getZoneSortKey(zone);
      let blocks = s.draftDoc.blocks;

      if (zone === "all") {
        blocks = reorder(blocks, oldIndex, newIndex).map((b, i) => ({ ...b, sort_order: i }));
      } else if (sortKey) {
        // Filter blocks visible in this zone, reorder them, then re-emit per-zone sort_order.
        const flag =
          sortKey === "home_feed"
            ? "display_in_home_feed"
            : sortKey === "stories"
              ? "display_in_stories"
              : "display_in_grid";
        const visible = blocks.filter((b) => b[flag]);
        const reordered = reorder(visible, oldIndex, newIndex);
        const sortByBlockId = new Map<string, number>();
        reordered.forEach((b, i) => sortByBlockId.set(b.id, i));
        blocks = blocks.map((b) => {
          const idx = sortByBlockId.get(b.id);
          if (idx === undefined) return b;
          return {
            ...b,
            zone_overrides: {
              ...(b.zone_overrides ?? {}),
              [sortKey]: { ...(b.zone_overrides?.[sortKey] ?? {}), sort_order: idx },
            },
          } as LayoutBlock;
        });
      }
      return {
        draftDoc: { ...s.draftDoc, blocks, updated_at: new Date().toISOString() },
        dirty: true,
      };
    }),

  markClean: (newPublished) =>
    set((s) => ({
      publishedDoc: newPublished ?? s.publishedDoc,
      dirty: false,
    })),
}));
