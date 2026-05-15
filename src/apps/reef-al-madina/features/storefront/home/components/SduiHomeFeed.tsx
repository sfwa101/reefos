/**
 * SduiHomeFeed — "Clay Mode" In-Place Visual Builder.
 * ---------------------------------------------------
 * Reads the published `mobile_home_layout_v1` for normal viewers via
 * `useMobileHomeLayout`. When the active user holds `layout.edit` and toggles
 * the floating "وضع التحرير" button, this component:
 *   • Hydrates `useSectionManagerStore` from the gateway (`getAppSettingsFn`),
 *   • Renders blocks from the *draft* doc instead of the published projection,
 *   • Wraps each block with `<EditableBlockWrapper>` (move/edit/delete),
 *   • Inserts contextual "+" buttons between blocks,
 *   • Surfaces a "Save Draft / Publish" sticky bar that calls
 *     `upsertAppSettingFn` (Article 5 — gateway only, no direct DB writes).
 *
 * Empty/loading states still degrade gracefully.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  GalleryHorizontal,
  ImageIcon,
  LayoutGrid,
  Pencil,
  Plus,
  Save,
  Send,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobileHomeLayout } from "@/hooks/useMobileHomeLayout";
import {
  getAppSettingsFn,
  upsertAppSettingFn,
} from "@/core/system/admin-settings.functions";
import {
  MOBILE_HOME_LAYOUT_DRAFT_KEY,
  MOBILE_HOME_LAYOUT_KEY,
  type LayoutBlock,
  type LayoutBlockKind,
  type MobileHomeLayoutV1,
  type EntityRef,
} from "@/lib/section-manager.types";
import { useSectionManagerStore } from "@/components/admin/section-manager/useSectionManagerStore";
import { EditableBlockWrapper } from "./EditableBlockWrapper";
import { LiveBlockInspector } from "./LiveBlockInspector";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const KIND_ICON: Record<LayoutBlockKind, typeof Sparkles> = {
  hero_banner: ImageIcon,
  carousel: GalleryHorizontal,
  grid: LayoutGrid,
  category_strip: Tag,
  mega_offer: Sparkles,
  bundle_rail: GalleryHorizontal,
  section_ref: LayoutGrid,
  spacer: ImageIcon,
  html_note: ImageIcon,
};

// ---------------------------------------------------------------------------
// ULID generator (mirrors store/palette implementation; kept tiny & local).
// ---------------------------------------------------------------------------
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function genId(): string {
  let out = "";
  for (let i = 0; i < 26; i++) {
    out += ULID_ALPHABET[Math.floor(Math.random() * ULID_ALPHABET.length)];
  }
  return out;
}

function makeBlock(kind: LayoutBlockKind, sortOrder: number): LayoutBlock {
  return {
    id: genId(),
    kind,
    title: "قسم جديد",
    is_active: true,
    sort_order: sortOrder,
    display_in_home_feed: true,
    display_in_stories: false,
    display_in_grid: false,
  } as LayoutBlock;
}

// ---------------------------------------------------------------------------
// Story bar (read-only for now — edit mode focuses on the home feed).
// ---------------------------------------------------------------------------
function StoryBubble({ block }: { block: LayoutBlock }) {
  const icon = block.zone_overrides?.stories?.icon_url;
  const label = block.zone_overrides?.stories?.label ?? block.title ?? "قسم";
  const Icon = KIND_ICON[block.kind] ?? Sparkles;
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
        {icon ? (
          <img src={icon} alt={label} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-6 w-6 text-primary" />
        )}
      </div>
      <span className="line-clamp-1 text-xs text-foreground/80">{label}</span>
    </div>
  );
}

function StoryBar({ blocks, loading }: { blocks: LayoutBlock[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto px-4 pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }
  if (blocks.length === 0) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-3">
        {blocks.map((b) => (
          <StoryBubble key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home block — rendered inside (or outside) an EditableBlockWrapper.
// ---------------------------------------------------------------------------
function HomeBlock({
  block,
  editMode,
  onAddItem,
}: {
  block: LayoutBlock;
  editMode: boolean;
  onAddItem?: (block: LayoutBlock) => void;
}) {
  const Icon = KIND_ICON[block.kind] ?? Sparkles;
  const supportsItemAdd = block.kind === "carousel" || block.kind === "grid";
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {block.title ?? block.kind}
        </h2>
      </header>
      {block.subtitle ? (
        <p className="mb-2 text-sm text-muted-foreground">{block.subtitle}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {block.kind} · {block.entity_refs?.length ?? 0} عنصر
      </p>

      {editMode && supportsItemAdd && onAddItem ? (
        <Button
          type="button"
          onClick={() => onAddItem(block)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          {block.kind === "grid" ? "إضافة فئة" : "إضافة منتج"}
        </Button>
      ) : null}
    </section>
  );
}

function HomeFeedReadonly({ blocks, loading }: { blocks: LayoutBlock[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-3 px-4">
      {blocks.map((b) => (
        <HomeBlock key={b.id} block={b} editMode={false} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit-mode home feed (hydrated from store.draftDoc).
// ---------------------------------------------------------------------------
function HomeFeedEditable({
  blocks,
  onAddItem,
  onInsertAt,
}: {
  blocks: LayoutBlock[];
  onAddItem: (block: LayoutBlock) => void;
  onInsertAt: (index: number) => void;
}) {
  return (
    <div className="space-y-2 px-4">
      <InsertButton onClick={() => onInsertAt(0)} />
      {blocks.map((b, idx) => (
        <div key={b.id} className="space-y-2">
          <EditableBlockWrapper block={b} index={idx} total={blocks.length} active>
            <HomeBlock block={b} editMode onAddItem={onAddItem} />
          </EditableBlockWrapper>
          <InsertButton onClick={() => onInsertAt(idx + 1)} />
        </div>
      ))}
    </div>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-center">
      <Button
        type="button"
        onClick={onClick}
        className="group flex h-7 items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/[0.03] px-3 text-[11px] font-medium text-primary/80 opacity-60 transition hover:opacity-100"
        aria-label="إدراج قسم هنا"
      >
        <Plus className="h-3 w-3" />
        إدراج قسم
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save/Publish sticky bar.
// ---------------------------------------------------------------------------
function ClayModeSaveBar({
  dirty,
  onSaveDraft,
  onPublish,
  onExit,
  saving,
}: {
  dirty: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onExit: () => void;
  saving: "draft" | "publish" | null;
}) {
  return (
    <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/95 px-2 py-1.5 shadow-lg shadow-primary/20 backdrop-blur">
      <span className="px-2 text-[11px] font-medium text-muted-foreground">
        {dirty ? "تغييرات غير محفوظة" : "محفوظ"}
      </span>
      <Button
        type="button"
        onClick={onSaveDraft}
        disabled={!dirty || saving !== null}
        className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-40"
      >
        <Save className="h-3.5 w-3.5" />
        {saving === "draft" ? "..." : "حفظ مسودة"}
      </Button>
      <Button
        type="button"
        onClick={onPublish}
        disabled={saving !== null}
        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
      >
        <Send className="h-3.5 w-3.5" />
        {saving === "publish" ? "..." : "نشر"}
      </Button>
      <Button
        type="button"
        onClick={onExit}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        aria-label="إغلاق وضع التحرير"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating Edit toggle.
// ---------------------------------------------------------------------------
function LiveEditToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95",
        active
          ? "bg-foreground text-background shadow-foreground/30"
          : "bg-primary text-primary-foreground shadow-primary/30",
      )}
    >
      <Pencil className="h-4 w-4" />
      {active ? "إنهاء التحرير" : "وضع التحرير"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main component.
// ---------------------------------------------------------------------------
export function SduiHomeFeed() {
  const { homeBlocks, storyBlocks, loading, canEdit } = useMobileHomeLayout();
  const fetchSettings = useServerFn(getAppSettingsFn);
  const upsertSetting = useServerFn(upsertAppSettingFn);

  const draftDoc = useSectionManagerStore((s) => s.draftDoc);
  const dirty = useSectionManagerStore((s) => s.dirty);
  const init = useSectionManagerStore((s) => s.init);
  const insertBlockAt = useSectionManagerStore((s) => s.insertBlockAt);
  const addBlock = useSectionManagerStore((s) => s.addBlock);
  const markClean = useSectionManagerStore((s) => s.markClean);

  const [isVisualEditMode, setEditMode] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  // Hydrate the store the first time edit mode is toggled on.
  useEffect(() => {
    if (!isVisualEditMode) return;
    let cancelled = false;
    setHydrating(true);
    (async () => {
      try {
        const bundle = await fetchSettings({
          data: { keys: [MOBILE_HOME_LAYOUT_KEY, MOBILE_HOME_LAYOUT_DRAFT_KEY] },
        });
        if (cancelled) return;
        const pub = (bundle[MOBILE_HOME_LAYOUT_KEY] ?? null) as MobileHomeLayoutV1 | null;
        const drf = (bundle[MOBILE_HOME_LAYOUT_DRAFT_KEY] ?? null) as MobileHomeLayoutV1 | null;
        init(
          pub && Object.keys(pub).length ? pub : null,
          drf && Object.keys(drf).length ? drf : null,
        );
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isVisualEditMode, fetchSettings, init]);

  const editableHomeBlocks = useMemo<LayoutBlock[]>(() => {
    if (!draftDoc) return [];
    return draftDoc.blocks
      .filter((b) => b.display_in_home_feed)
      .slice()
      .sort((a, b) => {
        const ao = a.zone_overrides?.home_feed?.sort_order ?? a.sort_order;
        const bo = b.zone_overrides?.home_feed?.sort_order ?? b.sort_order;
        return ao - bo;
      });
  }, [draftDoc]);

  const onSaveDraft = async () => {
    if (!draftDoc) return;
    setSaving("draft");
    try {
      await upsertSetting({ data: { key: MOBILE_HOME_LAYOUT_DRAFT_KEY, value: draftDoc } });
      toast.success("تم حفظ المسودة");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const onPublish = async () => {
    if (!draftDoc) return;
    setSaving("publish");
    try {
      await upsertSetting({ data: { key: MOBILE_HOME_LAYOUT_KEY, value: draftDoc } });
      markClean(draftDoc);
      toast.success("تم النشر");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleInsertAt = (index: number) => {
    const block = makeBlock("hero_banner", index);
    insertBlockAt(index, block);
    toast.info("تم إضافة قسم جديد — افتح المفتش لتعديله");
  };

  const handleAddItem = (parent: LayoutBlock) => {
    // Auto-understanding path: seed a new sibling block with the parent's
    // entity_refs as context. The Property Inspector (next wave) will turn
    // this into a real picker for products / categories.
    const seeded: LayoutBlock = {
      ...makeBlock(parent.kind, (draftDoc?.blocks.length ?? 0)),
      title: parent.title ? `${parent.title} — جديد` : "عنصر جديد",
      entity_refs: (parent.entity_refs ?? []) as EntityRef[],
    };
    addBlock(seeded);
    toast.info(
      parent.kind === "grid"
        ? "تم تجهيز فئة جديدة بنفس سياق الشبكة"
        : "تم تجهيز منتج جديد بنفس سياق العرض",
    );
  };

  // ---------- Render ----------
  const isEmpty =
    !loading && !isVisualEditMode && homeBlocks.length === 0 && storyBlocks.length === 0;
  const showEditableFeed = isVisualEditMode && !hydrating;

  return (
    <div className="space-y-4">
      <StoryBar blocks={storyBlocks} loading={loading} />

      {showEditableFeed ? (
        <HomeFeedEditable
          blocks={editableHomeBlocks}
          onAddItem={handleAddItem}
          onInsertAt={handleInsertAt}
        />
      ) : (
        <HomeFeedReadonly blocks={homeBlocks} loading={loading || (isVisualEditMode && hydrating)} />
      )}

      {isEmpty && canEdit ? (
        <div className="mx-4 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            لا توجد أقسام منشورة بعد. افتح وضع التحرير لإضافة أول قسم.
          </p>
        </div>
      ) : null}

      {canEdit ? (
        <LiveEditToggle
          active={isVisualEditMode}
          onClick={() => setEditMode((v) => !v)}
        />
      ) : null}

      {canEdit && isVisualEditMode ? (
        <ClayModeSaveBar
          dirty={dirty}
          saving={saving}
          onSaveDraft={onSaveDraft}
          onPublish={onPublish}
          onExit={() => setEditMode(false)}
        />
      ) : null}

      {canEdit && isVisualEditMode ? <LiveBlockInspector /> : null}
    </div>
  );
}

export default SduiHomeFeed;
