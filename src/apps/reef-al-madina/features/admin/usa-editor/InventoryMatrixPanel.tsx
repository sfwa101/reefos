/**
 * InventoryMatrixPanel — Phase 8 Part 2.
 * Lists / edits decentralized stock per location/vendor for an asset's SKUs.
 */
import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Boxes, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useInventoryMatrix, useUpdateInventory, type InventoryRow } from "@/core/hakim-ai/hooks/useInventoryMatrix";
import { listAssetSkusFn } from "@/core/catalog/admin-catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkuRow { id: string; sku_code: string; }

interface DraftRow {
  key: string;
  existingId?: string;
  location_id: string;
  quantity: string;
}

const useAssetSkus = (assetId: string | undefined) =>
  useQuery<SkuRow[]>({
    queryKey: ["salsabil_skus", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const rows = await listAssetSkusFn({ data: { asset_id: assetId! } });
      return rows;
    },
  });

function rowsFromInventory(inv: InventoryRow[] | undefined): DraftRow[] {
  if (!inv?.length) return [];
  return inv.map((r) => ({
    key: r.id,
    existingId: r.id,
    location_id: r.location_code ?? "",
    quantity: String((r.availability_data as { count?: number })?.count ?? ""),
  }));
}

export default function InventoryMatrixPanel({ assetId }: { assetId: string }) {
  const { data: skus, isLoading: loadingSkus } = useAssetSkus(assetId);
  const [activeSku, setActiveSku] = useState<string | undefined>();
  useEffect(() => {
    if (!activeSku && skus?.length) setActiveSku(skus[0].id);
  }, [skus, activeSku]);

  const { data: inv, isLoading: loadingInv } = useInventoryMatrix(activeSku);
  const update = useUpdateInventory();

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  useEffect(() => { setDrafts(rowsFromInventory(inv)); }, [inv, activeSku]);

  const addRow = () =>
    setDrafts((d) => [...d, { key: `new-${Date.now()}-${d.length}`, location_id: "", quantity: "" }]);
  const removeRow = (key: string) => setDrafts((d) => d.filter((r) => r.key !== key));
  const patch = (key: string, p: Partial<DraftRow>) =>
    setDrafts((d) => d.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const saveAll = async () => {
    if (!activeSku) return;
    for (const row of drafts) {
      const loc = row.location_id.trim();
      const qty = Number(row.quantity);
      if (!loc || Number.isNaN(qty) || qty < 0) continue;
      await update.mutateAsync({
        sku_id: activeSku,
        location_id: loc,
        inventory_type: "count",
        availability: { count: qty },
      });
    }
  };

  if (loadingSkus) {
    return (
      <div className="h-40 flex items-center justify-center text-foreground-tertiary">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!skus?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-background-secondary/40 p-6 text-center">
        <Boxes className="h-7 w-7 text-primary mx-auto mb-2" />
        <p className="text-[13px] font-display">لا توجد SKUs لهذا الأصل بعد.</p>
        <p className="text-[11px] text-foreground-tertiary mt-1">سيتم إنشاء SKU افتراضي عند سكّ الأصل.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skus.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {skus.map((s) => (
            <Button
              key={s.id}
              type="button"
              onClick={() => setActiveSku(s.id)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-full border transition ${
                activeSku === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground-secondary"
              }`}
            >
              {s.sku_code}
            </Button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border/40 bg-background-secondary/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-foreground-tertiary">
            مصفوفة المواقع / البائعين
          </span>
          <Button
            type="button"
            onClick={addRow}
            className="text-[11px] font-bold inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة موقع
          </Button>
        </div>

        {loadingInv ? (
          <div className="h-24 flex items-center justify-center text-foreground-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-[11.5px] text-foreground-tertiary text-center py-6">
            لا توجد سجلات مخزون. أضف موقعاً أو بائعاً للبدء.
          </p>
        ) : (
          <div className="space-y-2">
            {drafts.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <Input
                  value={r.location_id}
                  onChange={(e) => patch(r.key, { location_id: e.target.value })}
                  placeholder="موقع المخزن / البائع"
                  className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-[12.5px] outline-none focus:border-primary"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={r.quantity}
                  onChange={(e) => patch(r.key, { quantity: e.target.value })}
                  placeholder="الكمية"
                  dir="ltr"
                  className="w-24 h-10 rounded-xl border border-border bg-background px-3 text-[13px] num font-semibold outline-none focus:border-primary text-left"
                />
                <Button
                  type="button"
                  onClick={() => removeRow(r.key)}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={saveAll}
        disabled={update.isPending || drafts.length === 0}
        className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {update.isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> جاري حفظ المصفوفة…</>
        ) : (
          <><Save className="h-4 w-4" /> حفظ مصفوفة المخزون</>
        )}
      </Button>
    </div>
  );
}
