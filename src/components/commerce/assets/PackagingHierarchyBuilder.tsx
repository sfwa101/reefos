/**
 * PackagingHierarchyBuilder — Phase D-2
 *
 * Visual, recursive builder for the Economic Packaging Runtime
 * (`salsabil_packaging_tiers`). User edits a flat list of `PackagingTierDraft`
 * rows; we render them as a nested tree based on `parent_tier_id`.
 *
 * Smart-math: the user only enters `conversion_to_parent`. The component
 * derives `conversion_to_base` by walking the parent chain on every change.
 *
 * Single-stock-keeper invariant is enforced in the UI: ticking
 * `is_stock_keeping` on one tier untoggles it on the rest. Same for
 * `is_default_sell` and `is_default_buy`.
 *
 * The component is presentation-only — it does NOT touch the DB. It calls
 * `onChange(tiers)` whenever the local state changes; the parent form is
 * responsible for persisting the array alongside the asset.
 */
import { useCallback, useMemo } from "react";
import {
  Layers,
  Package,
  Box,
  Plus,
  Trash2,
  CornerDownRight,
  Barcode,
  Anchor,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { PackagingTierDraft } from "@/core/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Draft = PackagingTierDraft & {
  id: string;
  parent_tier_id: string | null;
  tier_label: string;
  uom_code: string | null;
  conversion_to_parent: number;
  conversion_to_base: number;
  barcode: string | null;
  price_override: number | null;
  is_stock_keeping: boolean;
  is_default_sell: boolean;
  is_default_buy: boolean;
  is_active: boolean;
  sort_order: number;
  attributes: Record<string, unknown>;
};

interface UomOption {
  code: string;
  label: string;
}

interface Props {
  assetId?: string | null;
  value: PackagingTierDraft[];
  onChange: (tiers: PackagingTierDraft[]) => void;
  uomOptions?: UomOption[];
}

const DEFAULT_UOMS: UomOption[] = [
  { code: "piece", label: "قطعة" },
  { code: "g", label: "جرام" },
  { code: "kg", label: "كجم" },
  { code: "ml", label: "مل" },
  { code: "liter", label: "لتر" },
  { code: "box", label: "علبة" },
  { code: "pack", label: "عبوة" },
  { code: "bottle", label: "زجاجة" },
  { code: "bunch", label: "حزمة" },
  { code: "cup", label: "كوب" },
];

const TIER_PRESETS = [
  { label: "جرام", uom: "g", icon: Layers },
  { label: "كجم", uom: "kg", icon: Box },
  { label: "علبة", uom: "box", icon: Package },
  { label: "كرتونة", uom: "box", icon: Package },
  { label: "بالة", uom: "pack", icon: Layers },
];

let _idCounter = 0;
const tempId = () => `tmp-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;

const ensureDraft = (t: PackagingTierDraft): Draft => ({
  id: t.id ?? tempId(),
  asset_id: t.asset_id,
  parent_tier_id: t.parent_tier_id ?? null,
  tier_label: t.tier_label ?? "",
  uom_code: t.uom_code ?? null,
  conversion_to_parent: Number(t.conversion_to_parent ?? 1),
  conversion_to_base: Number(t.conversion_to_base ?? 1),
  barcode: t.barcode ?? null,
  price_override: t.price_override ?? null,
  is_stock_keeping: Boolean(t.is_stock_keeping),
  is_default_sell: Boolean(t.is_default_sell),
  is_default_buy: Boolean(t.is_default_buy),
  is_active: t.is_active ?? true,
  sort_order: t.sort_order ?? 0,
  attributes: t.attributes ?? {},
});

/** Walk parent chain and return base-multiplier for a given tier. */
const computeBase = (tier: Draft, byId: Map<string, Draft>): number => {
  let multiplier = Number(tier.conversion_to_parent) || 1;
  let cursor = tier.parent_tier_id;
  const guard = new Set<string>([tier.id]);
  while (cursor) {
    if (guard.has(cursor)) break; // cycle safety
    guard.add(cursor);
    const parent = byId.get(cursor);
    if (!parent) break;
    multiplier *= Number(parent.conversion_to_parent) || 1;
    cursor = parent.parent_tier_id;
  }
  return multiplier;
};

/** Recompute conversion_to_base for every tier from the parent chain. */
const recomputeBases = (tiers: Draft[]): Draft[] => {
  const byId = new Map(tiers.map((t) => [t.id, t]));
  return tiers.map((t) => ({ ...t, conversion_to_base: computeBase(t, byId) }));
};

export default function PackagingHierarchyBuilder({
  assetId,
  value,
  onChange,
  uomOptions = DEFAULT_UOMS,
}: Props) {
  const tiers = useMemo<Draft[]>(() => value.map(ensureDraft), [value]);

  const emit = useCallback(
    (next: Draft[]) => {
      const recomputed = recomputeBases(next);
      onChange(recomputed);
    },
    [onChange],
  );

  /** Tree grouping for visual rendering. */
  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, Draft[]>();
    for (const t of tiers) {
      const key = t.parent_tier_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [tiers]);

  const updateTier = (id: string, patch: Partial<Draft>) => {
    let next = tiers.map((t) => (t.id === id ? { ...t, ...patch } : t));

    // single-stock-keeper invariant
    if (patch.is_stock_keeping === true) {
      next = next.map((t) =>
        t.id === id ? t : { ...t, is_stock_keeping: false },
      );
    }
    if (patch.is_default_sell === true) {
      next = next.map((t) =>
        t.id === id ? t : { ...t, is_default_sell: false },
      );
    }
    if (patch.is_default_buy === true) {
      next = next.map((t) =>
        t.id === id ? t : { ...t, is_default_buy: false },
      );
    }
    emit(next);
  };

  const addTier = (parentId: string | null) => {
    const isFirst = tiers.length === 0;
    const fresh: Draft = ensureDraft({
      asset_id: assetId ?? "",
      parent_tier_id: parentId,
      tier_label: "",
      uom_code: parentId === null ? "piece" : null,
      conversion_to_parent: 1,
      conversion_to_base: 1,
      barcode: null,
      price_override: null,
      is_stock_keeping: isFirst, // root defaults as stock-keeping
      is_default_sell: isFirst,
      is_default_buy: isFirst,
      is_active: true,
      sort_order: tiers.filter((t) => t.parent_tier_id === parentId).length,
      attributes: {},
    });
    emit([...tiers, fresh]);
  };

  const removeTier = (id: string) => {
    // remove tier + all descendants
    const toRemove = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of tiers) {
        if (t.parent_tier_id && toRemove.has(t.parent_tier_id) && !toRemove.has(t.id)) {
          toRemove.add(t.id);
          grew = true;
        }
      }
    }
    emit(tiers.filter((t) => !toRemove.has(t.id)));
  };

  const applyPreset = (preset: (typeof TIER_PRESETS)[number]) => {
    if (tiers.length > 0) return;
    const fresh = ensureDraft({
      asset_id: assetId ?? "",
      parent_tier_id: null,
      tier_label: preset.label,
      uom_code: preset.uom,
      conversion_to_parent: 1,
      conversion_to_base: 1,
      barcode: null,
      price_override: null,
      is_stock_keeping: true,
      is_default_sell: true,
      is_default_buy: true,
      is_active: true,
      sort_order: 0,
      attributes: {},
    });
    emit([fresh]);
  };

  const renderTier = (tier: Draft, depth: number): React.ReactNode => {
    const children = childrenByParent.get(tier.id) ?? [];
    const isRoot = tier.parent_tier_id === null;
    const Icon = isRoot ? Anchor : depth === 1 ? Box : depth === 2 ? Package : Layers;

    return (
      <div key={tier.id} className="space-y-2">
        <div
          className="rounded-2xl border border-border bg-background-secondary/40 p-3 space-y-2.5"
          style={{ marginInlineStart: depth * 16 }}
        >
          <div className="flex items-center gap-2">
            {!isRoot && <CornerDownRight className="h-3.5 w-3.5 text-foreground-tertiary" />}
            <Icon className="h-4 w-4 text-primary" />
            <Input
              value={tier.tier_label}
              onChange={(e) => updateTier(tier.id, { tier_label: e.target.value })}
              placeholder={isRoot ? "اسم الوحدة الأساسية (مثل: جرام)" : "اسم الطبقة (مثل: كرتونة)"}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-[12.5px] font-bold outline-none focus:border-primary"
            />
            <Button
              type="button"
              onClick={() => removeTier(tier.id)}
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
              aria-label="حذف الطبقة"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">
                وحدة القياس
              </span>
              <select
                value={tier.uom_code ?? ""}
                onChange={(e) => updateTier(tier.id, { uom_code: e.target.value || null })}
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-[12px] outline-none focus:border-primary"
              >
                <option value="">— اختر —</option>
                {uomOptions.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.label} ({u.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">
                {isRoot ? "الكمية في الوحدة الأساسية" : "كم وحدة من الأب؟"}
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.000001"
                min="0"
                value={Number.isFinite(tier.conversion_to_parent) ? tier.conversion_to_parent : 1}
                onChange={(e) =>
                  updateTier(tier.id, {
                    conversion_to_parent: Number(e.target.value) || 0,
                  })
                }
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-[12.5px] num font-bold outline-none focus:border-primary text-left"
                dir="ltr"
                disabled={isRoot}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] font-bold text-foreground-tertiary mb-1 inline-flex items-center gap-1">
                <Barcode className="h-3 w-3" /> باركود
              </span>
              <Input
                value={tier.barcode ?? ""}
                onChange={(e) => updateTier(tier.id, { barcode: e.target.value || null })}
                placeholder="اختياري"
                dir="ltr"
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-[12px] num outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">
                سعر مخصص لهذه الطبقة
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={tier.price_override ?? ""}
                onChange={(e) =>
                  updateTier(tier.id, {
                    price_override:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder="فارغ = من العقد"
                dir="ltr"
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-[12.5px] num font-bold outline-none focus:border-primary text-left"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Toggle
              active={tier.is_stock_keeping}
              onClick={() => updateTier(tier.id, { is_stock_keeping: !tier.is_stock_keeping })}
              icon={<Anchor className="h-3 w-3" />}
              label="طبقة المخزون"
            />
            <Toggle
              active={tier.is_default_sell}
              onClick={() => updateTier(tier.id, { is_default_sell: !tier.is_default_sell })}
              icon={<ShoppingCart className="h-3 w-3" />}
              label="بيع افتراضي"
            />
            <Toggle
              active={tier.is_default_buy}
              onClick={() => updateTier(tier.id, { is_default_buy: !tier.is_default_buy })}
              icon={<Truck className="h-3 w-3" />}
              label="شراء افتراضي"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10.5px] text-foreground-tertiary">
              ↳ يساوي{" "}
              <strong className="num text-foreground">
                {tier.conversion_to_base.toLocaleString(undefined, {
                  maximumFractionDigits: 6,
                })}
              </strong>{" "}
              من الوحدة الأساسية
            </span>
            <Button
              type="button"
              onClick={() => addTier(tier.id)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[10.5px] font-extrabold press"
            >
              <Plus className="h-3 w-3" /> طبقة فرعية
            </Button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="space-y-2">{children.map((c) => renderTier(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <Layers className="h-4 w-4 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="text-[12px] font-extrabold text-primary">شجرة العبوات</p>
          <p className="text-[10.5px] text-foreground-tertiary leading-relaxed">
            ابدأ من الوحدة الأساسية (مثل جرام أو قطعة) ثم أضف الطبقات الأكبر منها.
            الـ "طبقة المخزون" واحدة فقط لكل أصل وعليها يُمسك العدّ الفعلي.
          </p>
        </div>
      </div>

      {tiers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center space-y-3">
          <p className="text-[12px] font-bold text-foreground-tertiary">
            لا توجد طبقات بعد — اختَر قالباً سريعاً أو ابدأ يدوياً.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TIER_PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <Button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-background-secondary text-[11.5px] font-bold press border border-border hover:border-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {p.label}
                </Button>
              );
            })}
          </div>
          <Button
            type="button"
            onClick={() => addTier(null)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold press"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة طبقة أساسية
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">{roots.map((r) => renderTier(r, 0))}</div>
          <Button
            type="button"
            onClick={() => addTier(null)}
            className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-background-secondary text-[12px] font-extrabold press border border-dashed border-border hover:border-primary"
          >
            <Plus className="h-3.5 w-3.5" /> طبقة جذرية أخرى
          </Button>
        </>
      )}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10.5px] font-extrabold press border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border text-foreground-tertiary hover:border-primary/50"
      }`}
    >
      {icon}
      {label}
    </Button>
  );
}
