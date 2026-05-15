/**
 * EditableBlockWrapper — Clay Mode (Wave R-3 · In-Place Editor).
 * --------------------------------------------------------------
 * Surrounds a rendered storefront block with a translucent border + toolbar
 * (Move Up / Move Down / Edit / Delete) when the parent feed is in
 * `isVisualEditMode`. All actions are wired straight to the local Zustand
 * store — no DB writes here. Persistence happens via the storefront save
 * bar which calls `upsertAppSettingFn` (Article 5 compliant).
 */
import { ArrowDown, ArrowUp, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutBlock } from "@/lib/section-manager.types";
import { useSectionManagerStore } from "@/components/admin/section-manager/useSectionManagerStore";
import { Button } from "@/components/ui/button";

interface Props {
  block: LayoutBlock;
  index: number;
  total: number;
  active: boolean;
  children: React.ReactNode;
}

export function EditableBlockWrapper({ block, index, total, active, children }: Props) {
  const moveBlock = useSectionManagerStore((s) => s.moveBlock);
  const removeBlock = useSectionManagerStore((s) => s.removeBlock);
  const openInspector = useSectionManagerStore((s) => s.openInspector);

  if (!active) return <>{children}</>;

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed border-primary/50 bg-primary/[0.02] transition-all",
        "ring-1 ring-primary/10",
      )}
    >
      <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-full border border-border bg-background/95 px-1.5 py-1 shadow-md backdrop-blur">
        <Button
          type="button"
          onClick={() => moveBlock(block.id, "up")}
          disabled={index === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary disabled:opacity-30"
          aria-label="نقل لأعلى"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          onClick={() => moveBlock(block.id, "down")}
          disabled={index === total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary disabled:opacity-30"
          aria-label="نقل لأسفل"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          onClick={() => openInspector(block.id)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
          aria-label="تعديل"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          onClick={() => removeBlock(block.id)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-destructive hover:bg-destructive/10"
          aria-label="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span className="absolute -top-3 left-3 z-10 rounded-full border border-border bg-background/95 px-2 py-0.5 text-[10px] font-mono uppercase text-muted-foreground shadow-sm backdrop-blur">
        {block.kind}
      </span>
      <div className="p-1">{children}</div>
    </div>
  );
}

export default EditableBlockWrapper;
