// Block Inspector — Wave R-3 · Step 6B.
// Edits the currently selected block via the local Zustand store.
import { useSectionManagerStore } from "./useSectionManagerStore";
import { Input } from "@/components/ui/input";

export function BlockInspector() {
  const selectedId = useSectionManagerStore((s) => s.selectedBlockId);
  const block = useSectionManagerStore((s) =>
    s.draftDoc?.blocks.find((b) => b.id === selectedId) ?? null,
  );
  const updateBlock = useSectionManagerStore((s) => s.updateBlock);

  if (!block) {
    return (
      <div className="bg-surface rounded-2xl border border-border/40 p-4 min-h-[400px]">
        <h2 className="font-display text-sm mb-3">المُفتش</h2>
        <p className="text-[11.5px] text-foreground-tertiary">اختر كتلة لتعديلها.</p>
      </div>
    );
  }

  const patch = (p: Parameters<typeof updateBlock>[1]) => updateBlock(block.id, p);

  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-4 min-h-[400px] space-y-4">
      <div>
        <h2 className="font-display text-sm">المُفتش</h2>
        <p className="text-[10.5px] text-foreground-tertiary mt-0.5 font-mono">
          {block.kind} · {block.id.slice(0, 8)}…
        </p>
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-[11px] text-foreground-secondary font-medium">العنوان</span>
        <Input
          type="text"
          value={block.title ?? ""}
          onChange={(e) => patch({ title: e.target.value || undefined })}
          className="mt-1 w-full h-9 px-3 rounded-lg bg-surface-muted border border-border/40 text-[12.5px] focus:outline-none focus:border-primary/60"
          placeholder="عنوان الكتلة"
        />
      </label>

      {/* Subtitle */}
      <label className="block">
        <span className="text-[11px] text-foreground-secondary font-medium">العنوان الفرعي</span>
        <Input
          type="text"
          value={block.subtitle ?? ""}
          onChange={(e) => patch({ subtitle: e.target.value || undefined })}
          className="mt-1 w-full h-9 px-3 rounded-lg bg-surface-muted border border-border/40 text-[12.5px] focus:outline-none focus:border-primary/60"
          placeholder="اختياري"
        />
      </label>

      {/* Active toggle */}
      <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-muted">
        <span className="text-[12px] font-medium">مفعّل</span>
        <input
          type="checkbox"
          checked={block.is_active}
          onChange={(e) => patch({ is_active: e.target.checked })}
          className="h-4 w-4 accent-primary"
        />
      </label>

      {/* Target zones */}
      <div className="space-y-2">
        <span className="text-[11px] text-foreground-secondary font-medium">مناطق العرض</span>
        {[
          { key: "display_in_home_feed", label: "🏠 الرئيسية" },
          { key: "display_in_stories", label: "⭕ الستوري" },
          { key: "display_in_grid", label: "▦ شبكة الفئات" },
        ].map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-surface-muted"
          >
            <span className="text-[12px]">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(block[key as keyof typeof block])}
              onChange={(e) =>
                patch({ [key]: e.target.checked } as Parameters<typeof updateBlock>[1])
              }
              className="h-4 w-4 accent-primary"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
