// Section Manager — Sortable Block Card (Wave R-3 · Step 6A).
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Home, Circle, LayoutGrid } from "lucide-react";
import type { LayoutBlock } from "@/lib/section-manager.types";
import { useSectionManagerStore } from "./useSectionManagerStore";
import { cn } from "@/lib/utils";

interface BlockCardProps {
  block: LayoutBlock;
}

export function BlockCard({ block }: BlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const selectedBlockId = useSectionManagerStore((s) => s.selectedBlockId);
  const selectBlock = useSectionManagerStore((s) => s.selectBlock);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isSelected = selectedBlockId === block.id;
  const label = block.title || block.zone_overrides?.grid?.label || block.zone_overrides?.stories?.label || `(${block.kind})`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => selectBlock(block.id)}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-surface p-3 cursor-pointer transition-base",
        isSelected ? "border-primary shadow-glow" : "border-border/40 hover:border-border",
        !block.is_active && "opacity-60",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="text-foreground-tertiary hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="اسحب لإعادة الترتيب"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-foreground-tertiary font-mono">
            {block.kind}
          </span>
          {!block.is_active && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
              متوقف
            </span>
          )}
        </div>
        <p className="font-display text-[13px] truncate mt-0.5">{label}</p>
      </div>
      <div className="flex items-center gap-1">
        {block.display_in_home_feed && (
          <span title="الرئيسية" className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Home className="h-3 w-3" />
          </span>
        )}
        {block.display_in_stories && (
          <span title="الستوري" className="h-6 w-6 rounded-md bg-accent/10 text-accent flex items-center justify-center">
            <Circle className="h-3 w-3" />
          </span>
        )}
        {block.display_in_grid && (
          <span title="الشبكة" className="h-6 w-6 rounded-md bg-info/10 text-info flex items-center justify-center">
            <LayoutGrid className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
