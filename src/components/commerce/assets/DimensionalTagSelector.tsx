/**
 * DimensionalTagSelector — Phase D-5
 *
 * Lightning-fast multi-axis tag picker for the USA Editor.
 *
 *  - Reads the active vocabulary from `TagsGateway.listAll()`.
 *  - Lets the Emperor SEARCH existing tags or CREATE-on-the-fly by typing
 *    `axis:value` (e.g. `campaign:ramadan_2026`) and pressing Enter.
 *  - Groups selected tags visually by `tag_key` (department, campaign, diet…).
 *  - Pure controlled component — emits the lifted draft list via `onChange`.
 *    Does NOT touch the DB. Persistence is the parent editor's job (D-6).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Tags,
  Network,
  Hash,
  X,
  Plus,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TagsGateway } from "@/core/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AssetTag,
  AssetTagDraft,
  AssetTagLabelI18n,
} from "@/core/commerce/types/assetTag";

export interface DimensionalTagSelectorProps {
  assetId: string | null;
  /** Current selection (controlled by the parent editor). */
  value: AssetTagDraft[];
  onChange: (next: AssetTagDraft[]) => void;
}

/** Sanitize free text → snake_case-ish slug for tag_key/tag_value. */
function slug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const AXIS_LABELS_AR: Record<string, string> = {
  department: "القسم",
  campaign: "الحملة",
  diet: "النظام الغذائي",
  velocity: "السرعة",
  occasion: "المناسبة",
  brand: "الماركة",
  origin: "المنشأ",
  season: "الموسم",
};

function axisLabel(key: string): string {
  return AXIS_LABELS_AR[key] ?? key;
}

function tagDisplay(tag: AssetTagDraft, locale: "ar" | "en" = "ar"): string {
  const i18n = (tag.label_i18n ?? {}) as AssetTagLabelI18n;
  return i18n[locale] ?? i18n.en ?? i18n.ar ?? tag.tag_value;
}

function dedupeKey(t: { tag_key: string; tag_value: string }): string {
  return `${t.tag_key}::${t.tag_value}`;
}

export default function DimensionalTagSelector({
  value,
  onChange,
}: DimensionalTagSelectorProps) {
  const [vocab, setVocab] = useState<AssetTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeAxis, setActiveAxis] = useState<string>("department");
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate vocabulary on mount.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    TagsGateway.listAll()
      .then((rows) => {
        if (cancelled) return;
        setVocab(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "تعذّر تحميل قاموس الوسوم");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Quick lookup of selected pairs.
  const selectedKeys = useMemo(
    () => new Set(value.map((t) => dedupeKey(t))),
    [value],
  );

  // Parse query — supports `axis:value` shorthand to override active axis.
  const parsed = useMemo(() => {
    const raw = query.trim();
    if (!raw) return { axis: activeAxis, value: "", search: "" };
    if (raw.includes(":")) {
      const [k, ...rest] = raw.split(":");
      const v = rest.join(":").trim();
      return { axis: slug(k) || activeAxis, value: slug(v), search: v };
    }
    return { axis: activeAxis, value: slug(raw), search: raw };
  }, [query, activeAxis]);

  // Suggestions: filter vocab by search, hide already-selected.
  const suggestions = useMemo(() => {
    const search = parsed.search.toLowerCase();
    return vocab
      .filter((t) => {
        if (selectedKeys.has(dedupeKey(t))) return false;
        if (parsed.axis && t.tag_key !== parsed.axis) {
          // soft match: still show same-axis OR substring matches across axes
          if (!search) return false;
        }
        if (!search) return t.tag_key === parsed.axis;
        const hay = [
          t.tag_value,
          t.label_i18n.ar ?? "",
          t.label_i18n.en ?? "",
          t.tag_key,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      })
      .slice(0, 12);
  }, [vocab, parsed, selectedKeys]);

  // Group selected tags by axis for the visual chip-cluster.
  const grouped = useMemo(() => {
    const byAxis = new Map<string, AssetTagDraft[]>();
    for (const t of value) {
      const arr = byAxis.get(t.tag_key) ?? [];
      arr.push(t);
      byAxis.set(t.tag_key, arr);
    }
    return Array.from(byAxis.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [value]);

  const axisCandidates = useMemo(() => {
    const axes = new Set<string>(Object.keys(AXIS_LABELS_AR));
    for (const t of vocab) axes.add(t.tag_key);
    for (const t of value) axes.add(t.tag_key);
    return Array.from(axes).sort();
  }, [vocab, value]);

  const canCreate =
    parsed.value.length > 0 &&
    parsed.axis.length > 0 &&
    !selectedKeys.has(`${parsed.axis}::${parsed.value}`) &&
    !suggestions.some(
      (s) => s.tag_key === parsed.axis && s.tag_value === parsed.value,
    );

  const addExisting = (tag: AssetTag) => {
    if (selectedKeys.has(dedupeKey(tag))) return;
    onChange([
      ...value,
      {
        id: tag.id,
        tag_key: tag.tag_key,
        tag_value: tag.tag_value,
        label_i18n: tag.label_i18n,
        parent_tag_id: tag.parent_tag_id,
        metadata: tag.metadata,
        is_active: tag.is_active,
        sort_order: tag.sort_order,
      },
    ]);
    setQuery("");
    inputRef.current?.focus();
  };

  const addCreate = () => {
    if (!canCreate) return;
    const draft: AssetTagDraft = {
      tag_key: parsed.axis,
      tag_value: parsed.value,
      label_i18n: { ar: parsed.search.trim(), en: parsed.search.trim() },
      parent_tag_id: null,
      metadata: {},
      is_active: true,
      sort_order: 0,
    };
    onChange([...value, draft]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeAt = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addExisting(suggestions[0]);
      } else if (canCreate) {
        addCreate();
      }
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Axis quick-pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Network className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10.5px] font-bold text-foreground-tertiary">
          المحاور
        </span>
        {axisCandidates.map((axis) => (
          <Button
            key={axis}
            type="button"
            onClick={() => {
              setActiveAxis(axis);
              inputRef.current?.focus();
            }}
            className={`h-7 px-2.5 rounded-full text-[10.5px] font-extrabold press border transition ${
              activeAxis === axis
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground-tertiary hover:border-primary/40"
            }`}
          >
            {axisLabel(axis)}
          </Button>
        ))}
      </div>

      {/* Combobox input */}
      <div className="rounded-2xl border border-border bg-background-secondary/40 p-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-primary shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`ابحث في "${axisLabel(activeAxis)}" أو اكتب axis:value لإضافة جديد…`}
            className="flex-1 h-10 bg-transparent text-[13px] outline-none placeholder:text-foreground-tertiary/70"
            dir="auto"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-tertiary" />}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-500">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {/* Suggestions + create-on-the-fly */}
        {(suggestions.length > 0 || canCreate) && (
          <div className="rounded-xl bg-background border border-border/70 max-h-56 overflow-y-auto divide-y divide-border/40">
            {suggestions.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                onClick={() => addExisting(tag)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-right hover:bg-primary/5 press"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Hash className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[12.5px] font-semibold truncate">
                    {tagDisplay(tag)}
                  </span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-tertiary bg-muted/60 px-2 py-0.5 rounded-full shrink-0">
                  {axisLabel(tag.tag_key)}
                </span>
              </Button>
            ))}

            {canCreate && (
              <Button
                type="button"
                onClick={addCreate}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-right hover:bg-emerald-500/10 press"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[12.5px] font-semibold truncate">
                    إنشاء جديد:{" "}
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {parsed.search || parsed.value}
                    </span>
                  </span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                  {axisLabel(parsed.axis)}
                </span>
              </Button>
            )}
          </div>
        )}

        {!loading && suggestions.length === 0 && !canCreate && query.trim() === "" && vocab.length === 0 && (
          <div className="text-[11px] text-foreground-tertiary text-center py-2">
            لا يوجد قاموس وسوم بعد — اكتب{" "}
            <code className="px-1 rounded bg-muted text-[10.5px]">department:dairy</code>{" "}
            لإنشاء أول وسم.
          </div>
        )}
      </div>

      {/* Selected — grouped by axis */}
      {value.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-background-secondary/30 p-5 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-1.5" />
          <p className="text-[12px] font-display">لا توجد أبعاد بعد</p>
          <p className="text-[10.5px] text-foreground-tertiary mt-1">
            أضف وسماً واحداً على الأقل ليتموضع الأصل في الكتالوج متعدد الأبعاد.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(([axis, tags]) => (
            <div
              key={axis}
              className="rounded-2xl border border-border bg-background p-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Network className="h-3 w-3 text-primary" />
                <span className="text-[10.5px] font-extrabold text-foreground-tertiary uppercase tracking-wider">
                  {axisLabel(axis)}
                </span>
                <span className="text-[10px] num font-bold text-foreground-tertiary bg-muted/60 px-1.5 rounded-full">
                  {tags.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const idx = value.findIndex((x) => dedupeKey(x) === dedupeKey(t));
                  const isNew = !t.id; // created on the fly
                  return (
                    <span
                      key={dedupeKey(t)}
                      className={`inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full text-[11.5px] font-bold border ${
                        isNew
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      <Hash className="h-3 w-3 opacity-70" />
                      {tagDisplay(t)}
                      {isNew && (
                        <span className="text-[9px] font-extrabold opacity-70 ml-0.5">جديد</span>
                      )}
                      <Button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="h-5 w-5 rounded-full inline-flex items-center justify-center hover:bg-foreground/10 press"
                        aria-label="إزالة"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
