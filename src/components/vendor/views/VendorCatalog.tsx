/**
 * VendorCatalog — Phase 9 Part 2.
 * Read-only lens into the Universal Salsabil Asset (USA) catalog.
 * Vendors can declare local stock against existing assets — never mutate them.
 */
import { useMemo, useState } from "react";
import { Library, Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { UniversalAdminGrid, type Column, type RowAction, type BentoMetric } from "@/components/admin/UniversalAdminGrid";
import { useCurrentVendor } from "@/core/hakim-ai/hooks/useCurrentVendor";
import { useUpdateInventory } from "@/core/hakim-ai/hooks/useInventoryMatrix";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtNum } from "@/lib/format";

const ASSET_TYPE_LABEL: Record<string, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
  rental: "إيجار",
  milestone_project: "مشروع بمراحل",
};

interface RawAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  is_active: boolean;
  created_at: string;
  salsabil_skus?: Array<{ id: string }> | null;
  salsabil_financial_contracts?: Array<{ base_price: number; currency: string; is_active: boolean; valid_from: string }> | null;
}

interface CatalogRow {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  base_price: number | null;
  currency: string | null;
  first_sku_id: string | null;
  skus_count: number;
  created_at: string;
}

export default function VendorCatalog() {
  const { data: currentVendor, isLoading: vendorLoading } = useCurrentVendor();
  const updateInventory = useUpdateInventory();
  const [selectedAsset, setSelectedAsset] = useState<CatalogRow | null>(null);
  const [quantity, setQuantity] = useState<string>("");

  const metrics = useMemo<BentoMetric<CatalogRow>[]>(() => [
    { key: "total", label: "إجمالي الأصول", icon: Library, tone: "primary", compute: (rows) => fmtNum(rows.length) },
    { key: "physical", label: "أصول مادية", icon: Sparkles, tone: "info", compute: (rows) => fmtNum(rows.filter((r) => r.asset_type === "physical").length) },
  ], []);

  const columns = useMemo<Column<CatalogRow>[]>(() => [
    {
      key: "name",
      label: "الأصل",
      className: "flex-[2] min-w-0",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-[13.5px] truncate">{row.name}</p>
          {row.description && <p className="text-[11px] text-foreground-tertiary truncate">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "asset_type",
      label: "النوع",
      className: "flex-1",
      render: (row) => (
        <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {ASSET_TYPE_LABEL[row.asset_type] ?? row.asset_type}
        </span>
      ),
    },
    {
      key: "base_price",
      label: "السعر",
      className: "flex-1",
      hideOnMobile: true,
      render: (row) => row.base_price != null
        ? <span className="font-display num text-[13.5px]">{fmtMoney(row.base_price)} <span className="text-[10px] text-foreground-tertiary">{row.currency ?? "EGP"}</span></span>
        : <span className="text-foreground-tertiary text-[12px]">—</span>,
    },
  ], []);

  const rowActions = useMemo<RowAction<CatalogRow>[]>(() => [
    {
      label: "إضافة لمخزني",
      icon: Plus,
      onClick: (row) => {
        if (!row.first_sku_id) {
          toast.error("هذا الأصل لا يحتوي على SKU صالح.");
          return;
        }
        setSelectedAsset(row);
        setQuantity("");
      },
    },
  ], []);

  const handleSave = async () => {
    if (!selectedAsset?.first_sku_id || !currentVendor?.vendor.id) return;
    const count = Number(quantity);
    if (!Number.isFinite(count) || count < 0) {
      toast.error("أدخل كمية صحيحة.");
      return;
    }
    try {
      await updateInventory.mutateAsync({
        sku_id: selectedAsset.first_sku_id,
        location_id: currentVendor.vendor.id,
        inventory_type: "count",
        availability: { count },
      });
      toast.success("تمت إضافة الكمية لمخزن شركتك بنجاح");
      setSelectedAsset(null);
    } catch {
      // error toast already handled inside mutation
    }
  };

  if (vendorLoading) {
    return <div className="p-10 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!currentVendor) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px] text-foreground-secondary">لا يوجد كيان شركة (Tenant) مرتبط بحسابك بعد. تواصل مع الإدارة لربطك بشركة لتفعيل إضافة المخزون.</p>
      </div>
    );
  }

  return (
    <>
      <UniversalAdminGrid<CatalogRow>
        title="الكتالوج الموحد"
        subtitle={`أضف الكمية المتاحة لديك في «${currentVendor.vendor.business_name}» مقابل أي أصل من الكتالوج العالمي.`}
        metrics={metrics}
        columns={columns}
        rowActions={rowActions}
        searchPlaceholder="ابحث باسم أو وصف الأصل…"
        empty={{ icon: Library, title: "لا توجد أصول في الكتالوج بعد" }}
        dataSource={{
          table: "salsabil_assets",
          select: "id,name,description,asset_type,is_active,created_at,salsabil_skus(id),salsabil_financial_contracts(base_price,currency,is_active,valid_from)",
          orderBy: { column: "created_at", ascending: false },
          searchKeys: ["name", "description"],
          map: (rawRow: unknown): CatalogRow => {
            const raw = rawRow as RawAsset;
            const activeContract = (raw.salsabil_financial_contracts ?? [])
              .filter((c) => c.is_active)
              .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0];
            return {
              id: raw.id,
              name: raw.name,
              description: raw.description,
              asset_type: raw.asset_type,
              base_price: activeContract?.base_price ?? null,
              currency: activeContract?.currency ?? null,
              first_sku_id: raw.salsabil_skus?.[0]?.id ?? null,
              skus_count: raw.salsabil_skus?.length ?? 0,
              created_at: raw.created_at,
            };
          },
        }}
        rowKey={(row) => row.id}
      />

      <Dialog open={!!selectedAsset} onOpenChange={(o) => !o && setSelectedAsset(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px]">إضافة لمخزن شركتك</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="font-semibold text-[14px]">{selectedAsset.name}</p>
                <p className="text-[11px] text-foreground-tertiary mt-0.5">
                  {ASSET_TYPE_LABEL[selectedAsset.asset_type] ?? selectedAsset.asset_type} · {currentVendor.vendor.business_name}
                </p>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-foreground-secondary mb-1.5 block">
                  الكمية المتاحة في مخزنك
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="text-right num text-[16px] h-12"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setSelectedAsset(null)} disabled={updateInventory.isPending}>إلغاء</Button>
            <Button onClick={handleSave} disabled={updateInventory.isPending || !quantity}>
              {updateInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ الكمية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
