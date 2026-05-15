/**
 * VendorInventory — Phase 9 Part 3.
 * Tenant-isolated "My Inventory" dashboard.
 * Shows ONLY rows in the Decentralized Inventory Matrix tied to the current vendor entity.
 * Allows quantity edits and an optional Dynamic Price Override (stored in availability_data).
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Loader2, Package, Pencil, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { VendorGateway } from "@/core/vendor";
import { useCurrentVendor } from "@/core/hakim-ai/hooks/useCurrentVendor";
import { useUpdateInventory } from "@/core/hakim-ai/hooks/useInventoryMatrix";
import { UniversalAdminGrid, type Column, type RowAction, type BentoMetric } from "@/components/admin/UniversalAdminGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtMoney, fmtNum } from "@/lib/format";

interface VendorInvRow {
  id: string;
  sku_id: string;
  sku_code: string;
  asset_id: string;
  asset_name: string;
  asset_description: string | null;
  count: number;
  override_price: number | null;
  base_price: number | null;
  currency: string | null;
  updated_at: string;
}

const fmtDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
};

export default function VendorInventory() {
  const { data: currentVendor, isLoading: vendorLoading } = useCurrentVendor();
  const vendorId = currentVendor?.vendor.id ?? null;
  const updateInventory = useUpdateInventory();
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery<VendorInvRow[]>({
    queryKey: ["vendor-inventory", vendorId],
    enabled: !!vendorId,
    queryFn: async () => VendorGateway.listVendorInventory(vendorId!),
  });

  // ---- Edit dialog state ----
  const [editing, setEditing] = useState<VendorInvRow | null>(null);
  const [qty, setQty] = useState("");
  const [override, setOverride] = useState("");

  const openEdit = (row: VendorInvRow) => {
    setEditing(row);
    setQty(String(row.count));
    setOverride(row.override_price != null ? String(row.override_price) : "");
  };

  const handleSave = async () => {
    if (!editing || !vendorId) return;
    const count = Number(qty);
    if (!Number.isFinite(count) || count < 0) {
      toast.error("أدخل كمية صحيحة.");
      return;
    }
    const availability: Record<string, unknown> = { count };
    const trimmed = override.trim();
    if (trimmed !== "") {
      const ov = Number(trimmed);
      if (!Number.isFinite(ov) || ov <= 0) {
        toast.error("السعر الخاص يجب أن يكون رقمًا موجبًا أو فارغًا.");
        return;
      }
      availability.override_price = ov;
    }
    try {
      await updateInventory.mutateAsync({
        sku_id: editing.sku_id,
        location_id: vendorId,
        inventory_type: "count",
        availability,
      });
      qc.invalidateQueries({ queryKey: ["vendor-inventory", vendorId] });
      setEditing(null);
    } catch {
      // toast already handled
    }
  };

  // ---- Grid config ----
  const metrics = useMemo<BentoMetric<VendorInvRow>[]>(() => [
    { key: "skus", label: "أصناف في مخزني", icon: Boxes, tone: "primary", compute: (r) => fmtNum(r.length) },
    { key: "units", label: "إجمالي الوحدات", icon: Package, tone: "info", compute: (r) => fmtNum(r.reduce((s, x) => s + (x.count || 0), 0)) },
    { key: "low", label: "مخزون منخفض", icon: AlertTriangle, tone: "warning", compute: (r) => fmtNum(r.filter((x) => x.count < 5).length), urgent: (r) => r.some((x) => x.count < 5) },
  ], []);

  const columns = useMemo<Column<VendorInvRow>[]>(() => [
    {
      key: "asset_name",
      label: "الأصل",
      className: "flex-[2] min-w-0",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-[13.5px] truncate">{r.asset_name}</p>
          <p className="text-[10.5px] text-foreground-tertiary truncate">SKU: <span className="num">{r.sku_code}</span></p>
        </div>
      ),
    },
    {
      key: "count",
      label: "الكمية",
      className: "flex-1",
      render: (r) => (
        <span className={`font-display num text-[14px] ${r.count < 5 ? "text-[hsl(var(--accent))]" : ""}`}>
          {fmtNum(r.count)}
        </span>
      ),
    },
    {
      key: "price",
      label: "السعر",
      className: "flex-1",
      hideOnMobile: true,
      render: (r) => {
        if (r.override_price != null) {
          return (
            <div className="flex flex-col">
              <span className="font-display num text-[13.5px] text-primary">{fmtMoney(r.override_price)} <span className="text-[10px]">{r.currency ?? "EGP"}</span></span>
              <span className="text-[10px] text-foreground-tertiary line-through num">{r.base_price != null ? fmtMoney(r.base_price) : "—"}</span>
            </div>
          );
        }
        return r.base_price != null
          ? <span className="font-display num text-[13.5px]">{fmtMoney(r.base_price)} <span className="text-[10px] text-foreground-tertiary">{r.currency ?? "EGP"}</span></span>
          : <span className="text-foreground-tertiary text-[12px]">—</span>;
      },
    },
    {
      key: "updated_at",
      label: "آخر تحديث",
      className: "flex-1",
      hideOnMobile: true,
      render: (r) => <span className="text-[11.5px] text-foreground-tertiary">{fmtDate(r.updated_at)}</span>,
    },
  ], []);

  const rowActions = useMemo<RowAction<VendorInvRow>[]>(() => [
    { label: "تعديل المخزون", icon: Pencil, onClick: openEdit },
  ], []);

  if (vendorLoading) {
    return <div className="p-10 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!currentVendor) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px] text-foreground-secondary">لا يوجد كيان شركة (Tenant) مرتبط بحسابك بعد. تواصل مع الإدارة لربطك بشركة.</p>
      </div>
    );
  }

  return (
    <>
      <UniversalAdminGrid<VendorInvRow>
        title="مخزوني"
        subtitle={`المخزون المُعلن لشركة «${currentVendor.vendor.business_name}» في المصفوفة اللامركزية.`}
        metrics={metrics}
        columns={columns}
        rowActions={rowActions}
        searchPlaceholder="ابحث باسم الأصل أو رمز SKU…"
        empty={{ icon: Boxes, title: "لم تُعلن أي مخزون بعد", hint: "ابدأ من تبويب «الكتالوج» وأضف الأصناف التي تتوفر لديك." }}
        dataSource={{
          fetcher: async () => rows ?? [],
          searchKeys: ["asset_name", "sku_code"],
        }}
        rowKey={(r) => r.id}
      />
      {isLoading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 shadow-soft text-[12px] flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري تحميل المخزون…
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px]">تعديل المخزون</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="font-semibold text-[14px]">{editing.asset_name}</p>
                <p className="text-[11px] text-foreground-tertiary mt-0.5 num">SKU: {editing.sku_code}</p>
                {editing.base_price != null && (
                  <p className="text-[11px] text-foreground-tertiary mt-1">
                    السعر الرسمي: <span className="num">{fmtMoney(editing.base_price)} {editing.currency ?? "EGP"}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground-secondary mb-1.5 block">
                  الكمية المتاحة
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  className="text-right num text-[16px] h-12"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-foreground-secondary mb-1.5 flex items-center gap-1.5">
                  السعر الخاص (اختياري)
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" className="text-foreground-tertiary hover:text-primary">
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-[11.5px] leading-relaxed">
                        اتركه فارغاً للبيع بالسعر الرسمي الموحد. أضف سعراً هنا إذا كنت تقدم خدمة إضافية أو بسبب تكاليف منطقتك.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={override}
                  onChange={(e) => setOverride(e.target.value)}
                  placeholder={editing.base_price != null ? String(editing.base_price) : "—"}
                  className="text-right num text-[16px] h-12"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={updateInventory.isPending}>إلغاء</Button>
            <Button onClick={handleSave} disabled={updateInventory.isPending}>
              {updateInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
