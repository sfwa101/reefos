/**
 * SduiHomeFeed — Wave R-3 · Step 10.
 * ----------------------------------
 * Renders the published `mobile_home_layout_v1` document into the two
 * customer-facing zones (Story Bar + Home Feed) using `useMobileHomeLayout`.
 * If the active user holds the `layout.edit` capability, a floating "Live
 * Edit" overlay is shown that links into the Section Manager workbench.
 *
 * Pure presentation: no DB calls, no hardcoded blocks. Empty/loading
 * states degrade gracefully so the storefront never renders blank.
 */
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  GalleryHorizontal,
  ImageIcon,
  LayoutGrid,
  Pencil,
  Sparkles,
  Tag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMobileHomeLayout } from "@/hooks/useMobileHomeLayout";
import type { LayoutBlock, LayoutBlockKind } from "@/lib/section-manager.types";

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

function HomeBlock({ block }: { block: LayoutBlock }) {
  const Icon = KIND_ICON[block.kind] ?? Sparkles;
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
    </section>
  );
}

function HomeFeed({ blocks, loading }: { blocks: LayoutBlock[]; loading: boolean }) {
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
        <HomeBlock key={b.id} block={b} />
      ))}
    </div>
  );
}

function LiveEditOverlay() {
  return (
    <Link
      to="/admin/section-manager"
      onClick={() => toast.info("جارٍ فتح وضع التحرير المباشر…")}
      className="fixed bottom-24 left-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
    >
      <Pencil className="h-4 w-4" />
      وضع التحرير
    </Link>
  );
}

export function SduiHomeFeed() {
  const { homeBlocks, storyBlocks, loading, canEdit } = useMobileHomeLayout();
  const isEmpty = !loading && homeBlocks.length === 0 && storyBlocks.length === 0;

  return (
    <div className="space-y-4">
      <StoryBar blocks={storyBlocks} loading={loading} />
      <HomeFeed blocks={homeBlocks} loading={loading} />
      {isEmpty && canEdit ? (
        <div className="mx-4 rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            لا توجد أقسام منشورة بعد. افتح وضع التحرير لإضافة أول قسم.
          </p>
        </div>
      ) : null}
      {canEdit ? <LiveEditOverlay /> : null}
    </div>
  );
}

export default SduiHomeFeed;
