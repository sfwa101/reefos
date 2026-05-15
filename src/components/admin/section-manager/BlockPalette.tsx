// Block Palette — Wave R-3 · Step 6B.
// Click a kind to append a new LayoutBlock to the draft.
import {
  Image as ImageIcon,
  GalleryHorizontal,
  LayoutGrid,
  Sparkles,
  Tag,
  Plus,
} from "lucide-react";
import {
  LAYOUT_BLOCK_KINDS,
  type LayoutBlock,
  type LayoutBlockKind,
} from "@/lib/section-manager.types";
import { useSectionManagerStore } from "./useSectionManagerStore";
import { Button } from "@/components/ui/button";

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function genUlid(): string {
  let out = "";
  for (let i = 0; i < 26; i++) {
    out += ULID_ALPHABET[Math.floor(Math.random() * ULID_ALPHABET.length)];
  }
  return out;
}

const KIND_META: Record<
  LayoutBlockKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  hero_banner: { label: "بانر رئيسي", icon: ImageIcon },
  carousel: { label: "كاروسيل", icon: GalleryHorizontal },
  grid: { label: "شبكة", icon: LayoutGrid },
  category_strip: { label: "شريط فئات", icon: Tag },
  mega_offer: { label: "عرض ضخم", icon: Sparkles },
  bundle_rail: { label: "حزم", icon: LayoutGrid },
  section_ref: { label: "مرجع قسم", icon: Tag },
  spacer: { label: "فاصل", icon: Plus },
  html_note: { label: "ملاحظة", icon: Plus },
};

export function BlockPalette() {
  const addBlock = useSectionManagerStore((s) => s.addBlock);

  const handleAdd = (kind: LayoutBlockKind) => {
    const block: LayoutBlock = {
      id: genUlid(),
      kind,
      title: KIND_META[kind].label,
      is_active: true,
      sort_order: 0, // overridden by store
      display_in_home_feed: true,
      display_in_stories: false,
      display_in_grid: false,
    } as LayoutBlock;
    addBlock(block);
  };

  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-4 min-h-[400px]">
      <h2 className="font-display text-sm mb-3">مكتبة الكتل</h2>
      <div className="grid grid-cols-2 gap-2">
        {LAYOUT_BLOCK_KINDS.map((kind) => {
          const meta = KIND_META[kind];
          const Icon = meta.icon;
          return (
            <Button
              key={kind}
              onClick={() => handleAdd(kind)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/40 bg-surface-muted hover:bg-primary/10 hover:border-primary/40 press transition-base"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-[11.5px] font-medium text-foreground">{meta.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
