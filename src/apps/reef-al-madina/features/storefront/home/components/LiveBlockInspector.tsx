/**
 * LiveBlockInspector — Salsabil-Grade Live Property Editor.
 * ---------------------------------------------------------
 * A floating, OS-style right-side drawer that edits the SDUI block
 * referenced by `inspectingBlockId` in `useSectionManagerStore`. Every
 * input writes through `updateBlock(id, patch)` so the storefront re-renders
 * behind the panel in real time. No DB writes — persistence is owned by
 * the Save/Publish bar in `SduiHomeFeed` (Article 5 compliant).
 */
import { X } from "lucide-react";
import { useSectionManagerStore } from "@/components/admin/section-manager/useSectionManagerStore";
import type { LayoutBlock } from "@/lib/section-manager.types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tone = "primary" | "accent" | "info" | "success" | "warning" | "teal";
type Padding = "sm" | "md" | "lg";
type Columns = 2 | 3 | 4;

const TONES: { value: Tone; label: string; swatch: string }[] = [
  { value: "primary", label: "أساسي", swatch: "bg-primary" },
  { value: "accent", label: "مميّز", swatch: "bg-accent" },
  { value: "info", label: "معلوماتي", swatch: "bg-sky-500" },
  { value: "success", label: "نجاح", swatch: "bg-emerald-500" },
  { value: "warning", label: "تنبيه", swatch: "bg-amber-500" },
  { value: "teal", label: "فيروزي", swatch: "bg-teal-500" },
];

const PADDINGS: { value: Padding; label: string }[] = [
  { value: "sm", label: "ضيّق" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "واسع" },
];

const COLUMNS: Columns[] = [2, 3, 4];

export function LiveBlockInspector() {
  const inspectingId = useSectionManagerStore((s) => s.inspectingBlockId);
  const block = useSectionManagerStore((s) =>
    s.draftDoc?.blocks.find((b) => b.id === inspectingId) ?? null,
  );
  const updateBlock = useSectionManagerStore((s) => s.updateBlock);
  const closeInspector = useSectionManagerStore((s) => s.closeInspector);

  if (!inspectingId || !block) return null;

  const cfg = block.config ?? {};
  const patchConfig = (p: Partial<LayoutBlock["config"]>) =>
    updateBlock(block.id, { config: { ...cfg, ...p } });

  return (
    <>
      {/* Backdrop */}
      <Button
        type="button"
        aria-label="إغلاق"
        onClick={closeInspector}
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside
        dir="rtl"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(92vw,380px)] flex-col",
          "border-l border-border/60 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl",
          "animate-in slide-in-from-left duration-200",
        )}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-md shadow-primary/30">
            <span className="text-xs font-bold text-primary-foreground">
              {block.kind.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">المُفتش الحي</h2>
            <p className="truncate font-mono text-[10.5px] text-muted-foreground">
              {block.kind} · {block.id.slice(0, 8)}…
            </p>
          </div>
          <Button
            type="button"
            onClick={closeInspector}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Title */}
          <Field label="العنوان">
            <Input
              type="text"
              value={block.title ?? ""}
              onChange={(e) => updateBlock(block.id, { title: e.target.value || undefined })}
              placeholder="عنوان القسم"
              className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          {/* Subtitle */}
          <Field label="العنوان الفرعي">
            <Input
              type="text"
              value={block.subtitle ?? ""}
              onChange={(e) => updateBlock(block.id, { subtitle: e.target.value || undefined })}
              placeholder="اختياري"
              className="h-10 w-full rounded-xl border border-border/60 bg-muted/30 px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          {/* Active toggle */}
          <ToggleRow
            label="مفعّل"
            hint="يظهر هذا القسم على الواجهة عند تشغيله"
            checked={block.is_active}
            onChange={(v) => updateBlock(block.id, { is_active: v })}
          />

          {/* Tone */}
          <Field label="اللون / النغمة">
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((t) => {
                const active = cfg.tone === t.value;
                return (
                  <Button
                    key={t.value}
                    type="button"
                    onClick={() => patchConfig({ tone: t.value })}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11.5px] font-medium transition",
                      active
                        ? "border-primary/70 bg-primary/10 text-foreground shadow-sm shadow-primary/20"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-3 w-3 rounded-full ring-2 ring-background", t.swatch)} />
                    {t.label}
                  </Button>
                );
              })}
            </div>
          </Field>

          {/* Padding */}
          <Field label="الحشو">
            <div className="grid grid-cols-3 gap-2">
              {PADDINGS.map((p) => {
                const active = cfg.padding === p.value;
                return (
                  <Button
                    key={p.value}
                    type="button"
                    onClick={() => patchConfig({ padding: p.value })}
                    className={cn(
                      "h-9 rounded-xl border text-[12px] font-medium transition",
                      active
                        ? "border-primary/70 bg-primary/10 text-foreground"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </Field>

          {/* Columns (grid only) */}
          {block.kind === "grid" ? (
            <Field label="عدد الأعمدة">
              <div className="grid grid-cols-3 gap-2">
                {COLUMNS.map((c) => {
                  const active = cfg.columns === c;
                  return (
                    <Button
                      key={c}
                      type="button"
                      onClick={() => patchConfig({ columns: c })}
                      className={cn(
                        "h-10 rounded-xl border text-[13px] font-bold transition",
                        active
                          ? "border-primary/70 bg-primary/10 text-foreground"
                          : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c}
                    </Button>
                  );
                })}
              </div>
            </Field>
          ) : null}

          {/* Zone visibility */}
          <Field label="مناطق العرض">
            <div className="space-y-1.5">
              {[
                { key: "display_in_home_feed", label: "🏠 الرئيسية" },
                { key: "display_in_stories", label: "⭕ الستوري" },
                { key: "display_in_grid", label: "▦ شبكة الفئات" },
              ].map(({ key, label }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={Boolean(block[key as keyof LayoutBlock])}
                  onChange={(v) =>
                    updateBlock(block.id, {
                      [key]: v,
                    } as Partial<LayoutBlock>)
                  }
                  compact
                />
              ))}
            </div>
          </Field>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
          <p className="text-[10.5px] text-muted-foreground">
            التغييرات حيّة — اضغط «نشر» في الشريط السفلي لاعتمادها.
          </p>
        </footer>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  compact,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 transition hover:border-border",
        compact ? "py-2" : "py-2.5",
      )}
    >
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        {hint ? <div className="text-[10.5px] text-muted-foreground">{hint}</div> : null}
      </div>
      <Button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-0.5" : "translate-x-[18px]",
          )}
        />
      </Button>
    </label>
  );
}

export default LiveBlockInspector;
