/**
 * LivingInventoryBuilder — Phase F-1
 *
 * Adaptive UI for setting stock against a Universal Salsabil Asset.
 * It detects the stock-keeping packaging tier (the single tier where
 * `is_stock_keeping === true`) and renders the inputs strictly for THAT
 * tier — preventing the Admin from ever assigning stock to the wrong unit.
 *
 * If packaging is disabled, the inputs target the Base Asset (NULL tier).
 *
 * Pure presentation — emits drafts upward via `onChange`, NEVER writes
 * directly to the DB. Persistence is handled by `InventoryGateway`.
 */
import { useEffect, useMemo } from "react";
import { Boxes, Warehouse, MapPin, AlertTriangle, Layers } from "lucide-react";
import type { PackagingTierDraft } from "@/core/commerce";
import type { InventoryDraft, InventoryKind } from "@/core/commerce/gateway/InventoryGateway";
import { Input } from "@/components/ui/input";

interface Props {
  packagingTiers: PackagingTierDraft[];
  packagingEnabled: boolean;
  value: InventoryDraft[];
  onChange: (next: InventoryDraft[]) => void;
}

const KIND_LABELS: Record<InventoryKind, string> = {
  count: "عدد قطع",
  capacity: "طاقة استيعاب",
  time_slots: "فترات زمنية",
};

function makeTmpId(): string {
  return `tmp-inv-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultDraft(tierLocalId: string | null): InventoryDraft {
  return {
    id: makeTmpId(),
    packaging_tier_local_id: tierLocalId,
    location_code: "MAIN_STORE",
    inventory_type: "count",
    availability_data: { quantity: 0 },
  };
}

export default function LivingInventoryBuilder({
  packagingTiers,
  packagingEnabled,
  value,
  onChange,
}: Props) {
  // 1. Smart detection — the SINGLE stock-keeping tier (if packaging on).
  const stockTier = useMemo(() => {
    if (!packagingEnabled) return null;
    return packagingTiers.find((t) => t.is_stock_keeping) ?? null;
  }, [packagingEnabled, packagingTiers]);

  // The local id we anchor stock against — null means "base asset".
  const targetLocalId: string | null = packagingEnabled
    ? (stockTier?.id ?? null)
    : null;

  const targetLabel: string = packagingEnabled
    ? (stockTier?.tier_label ?? "")
    : "الأصل الأساسي";

  // 2. Keep value in sync with the detected target. If the target shifts
  //    (Admin flipped is_stock_keeping to a different tier), drop drafts
  //    that no longer apply and seed a single fresh draft.
  useEffect(() => {
    // packaging on but no stock-keeping tier → clear.
    if (packagingEnabled && !stockTier) {
      if (value.length > 0) onChange([]);
      return;
    }
    const filtered = value.filter(
      (d) => d.packaging_tier_local_id === targetLocalId,
    );
    if (filtered.length === 0) {
      onChange([defaultDraft(targetLocalId)]);
    } else if (filtered.length !== value.length) {
      onChange(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLocalId, packagingEnabled, stockTier?.id]);

  // 3. Guard: packaging on but no tier marked is_stock_keeping.
  if (packagingEnabled && !stockTier) {
    return (
      <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[12.5px] font-extrabold text-amber-900 dark:text-amber-200">
            لم يتم تحديد وحدة المخزون بعد.
          </p>
          <p className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
            افتح تبويب "العبوات" وفعّل خيار <span className="font-bold">"وحدة تتبع المخزون"</span> على
            الوحدة التي تريد عدّ المخزون عندها (مثلاً الكرتونة أو القطعة).
          </p>
        </div>
      </div>
    );
  }

  const draft = value[0];
  if (!draft) return null;

  const updateDraft = (patch: Partial<InventoryDraft>) => {
    onChange([{ ...draft, ...patch }]);
  };

  const updateAvailability = (patch: Record<string, unknown>) => {
    onChange([
      { ...draft, availability_data: { ...draft.availability_data, ...patch } },
    ]);
  };

  const quantity = Number(
    (draft.availability_data as { quantity?: number })?.quantity ?? 0,
  );
  const capacity = Number(
    (draft.availability_data as { capacity?: number })?.capacity ?? 0,
  );

  return (
    <div className="space-y-3">
      {/* Anchor pill — shows the target tier. */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold text-foreground-tertiary">
            تتبع المخزون مطبّق على:
          </p>
          <p className="text-[12.5px] font-extrabold text-primary truncate">
            {targetLabel}
          </p>
        </div>
        <Boxes className="h-4 w-4 text-primary/60" />
      </div>

      {/* Location */}
      <label className="block">
        <span className="text-[10.5px] font-bold text-foreground-tertiary mb-1.5 inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> رمز الموقع / الفرع
        </span>
        <Input
          value={draft.location_code}
          onChange={(e) => updateDraft({ location_code: e.target.value })}
          placeholder="MAIN_STORE"
          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
          dir="ltr"
        />
      </label>

      {/* Inventory type */}
      <label className="block">
        <span className="text-[10.5px] font-bold text-foreground-tertiary mb-1.5 inline-flex items-center gap-1">
          <Warehouse className="h-3 w-3" /> نوع التتبع
        </span>
        <select
          value={draft.inventory_type}
          onChange={(e) =>
            updateDraft({ inventory_type: e.target.value as InventoryKind })
          }
          className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
        >
          {(Object.keys(KIND_LABELS) as InventoryKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      {/* Type-specific input */}
      {draft.inventory_type === "count" && (
        <label className="block">
          <span className="text-[10.5px] font-bold text-foreground-tertiary mb-1.5 inline-flex items-center gap-1">
            <Boxes className="h-3 w-3" /> الكمية المتاحة
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={Number.isFinite(quantity) ? quantity : 0}
            onChange={(e) =>
              updateAvailability({ quantity: Number(e.target.value) || 0 })
            }
            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[14px] num font-semibold outline-none focus:border-primary text-left"
            dir="ltr"
          />
        </label>
      )}

      {draft.inventory_type === "capacity" && (
        <label className="block">
          <span className="text-[10.5px] font-bold text-foreground-tertiary mb-1.5">
            الطاقة القصوى
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={Number.isFinite(capacity) ? capacity : 0}
            onChange={(e) =>
              updateAvailability({ capacity: Number(e.target.value) || 0 })
            }
            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[14px] num font-semibold outline-none focus:border-primary text-left"
            dir="ltr"
          />
        </label>
      )}

      {draft.inventory_type === "time_slots" && (
        <div className="rounded-xl border border-dashed border-border/60 bg-background-secondary/40 p-3 text-[10.5px] text-foreground-tertiary leading-relaxed">
          ستتوفر إدارة الفترات الزمنية بشكل تفصيلي في التحديث القادم. يتم
          الحفظ حالياً كحاوية فارغة جاهزة للتعبئة لاحقاً.
        </div>
      )}
    </div>
  );
}
