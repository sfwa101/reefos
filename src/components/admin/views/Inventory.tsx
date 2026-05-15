/**
 * Admin Inventory & Pricing — WAVE UI-11 (Steel Glass overhaul).
 *
 * Rebuilt with the Sovereign Glass Arsenal. Data flow is unchanged:
 *  - read: `fetchAdminCatalog` (Sovereign Catalog gateway).
 *  - write: `upsertSkuPrice` / `upsertSkuStock` (gateway, batched).
 *  - nested breakdown: `getNestedStockBreakdownFn` server fn.
 * The UI is pure presentation: SectionHeader, GlassTable, GlassEmptyState,
 * GlassDialog. Inline editing happens inside the dialog so the table stays
 * scannable on every viewport.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Loader2,
  PackageSearch,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import {
  GlassTable,
  type GlassTableColumn,
} from "@/components/admin/ui/GlassTable";
import { GlassEmptyState } from "@/components/admin/ui/GlassEmptyState";
import { GlassDialog, GlassDialogClose } from "@/components/admin/ui/GlassDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  fetchAdminCatalog,
  upsertSkuPrice,
  upsertSkuStock,
} from "@/core/commerce/knowledge/sovereignCatalog";
import { getNestedStockBreakdownFn } from "@/core/ops/ops.functions";

type Row = {
  id: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  is_active: boolean;
  source: string;
};

type Edit = { price?: string; stock?: string };

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-extrabold text-rose-700">
        <AlertTriangle className="h-3 w-3" strokeWidth={2.6} />
        نافد
      </span>
    );
  }
  if (stock < 20) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-extrabold text-amber-700">
        <AlertTriangle className="h-3 w-3" strokeWidth={2.6} />
        منخفض · {stock}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {stock}
    </span>
  );
}

export default function Inventory() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Row | null>(null);
  const [breakdown, setBreakdown] = useState<string>("");
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const load = async () => {
    setRows(null);
    try {
      const data = await fetchAdminCatalog();
      setRows(
        data.map<Row>((r) => ({
          id: r.id,
          name: r.name,
          unit: r.unit,
          price: r.price,
          stock: r.stock,
          is_active: r.is_active,
          source: r.source,
        })),
      );
    } catch (e) {
      toast.error((e as Error).message);
      setRows([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sources = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.source))).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (src !== "all" && r.source !== src) return false;
        if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [rows, src, q],
  );

  const dirtyCount = Object.keys(edits).length;
  const setEdit = (id: string, patch: Edit) =>
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const formatBreakdown = (raw: unknown): string => {
    if (!raw) return "";
    type Piece = {
      qty?: number;
      quantity?: number;
      unit?: string;
      unit_code?: string;
      code?: string;
    };
    const obj = raw as { breakdown?: Piece[]; units?: Piece[] };
    const list: Piece[] = Array.isArray(raw)
      ? (raw as Piece[])
      : (obj.breakdown ?? obj.units ?? []);
    if (!Array.isArray(list) || list.length === 0) return "";
    return list
      .filter((p) => p && (p.qty ?? p.quantity ?? 0) > 0)
      .map((p) => `${p.qty ?? p.quantity} ${p.unit ?? p.unit_code ?? p.code}`)
      .join("، ");
  };

  const openRow = async (r: Row) => {
    setSelected(r);
    setBreakdown("");
    setLoadingBreakdown(true);
    try {
      const data = await getNestedStockBreakdownFn({ data: { productId: r.id } });
      setBreakdown(formatBreakdown(data));
    } catch {
      setBreakdown("");
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const saveAll = async () => {
    if (!dirtyCount) return;
    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      for (const [skuId, patch] of Object.entries(edits)) {
        if (patch.price !== undefined && patch.price !== "") {
          tasks.push(upsertSkuPrice(skuId, Number(patch.price)));
        }
        if (patch.stock !== undefined && patch.stock !== "") {
          tasks.push(upsertSkuStock(skuId, Number(patch.stock)));
        }
      }
      const results = await Promise.allSettled(tasks);
      const errs = results.filter((r) => r.status === "rejected");
      if (errs.length) {
        toast.error(`فشل ${errs.length} عملية`);
      } else {
        toast.success(`تم حفظ ${dirtyCount} منتج`);
        setEdits({});
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: GlassTableColumn<Row>[] = [
    {
      id: "name",
      header: "المنتج",
      cell: (r) => {
        const dirty = !!edits[r.id];
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-foreground/90">
                {r.name}
              </span>
              {dirty && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-extrabold text-amber-700">
                  معدّل
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {r.unit} · {r.source}
            </div>
          </div>
        );
      },
    },
    {
      id: "price",
      header: "السعر",
      align: "end",
      width: "w-28",
      hideOnMobile: true,
      cell: (r) => (
        <span className="font-display text-[13px] font-extrabold tracking-tight">
          {fmtMoney(edits[r.id]?.price ? Number(edits[r.id].price) : r.price)}
        </span>
      ),
    },
    {
      id: "stock",
      header: "المخزون",
      align: "end",
      width: "w-32",
      cell: (r) => (
        <StockBadge
          stock={
            edits[r.id]?.stock !== undefined
              ? Number(edits[r.id].stock)
              : r.stock
          }
        />
      ),
    },
  ];

  const selectedEdit = selected ? edits[selected.id] ?? {} : {};
  const selectedPrice =
    selectedEdit.price ?? (selected ? String(selected.price) : "");
  const selectedStock =
    selectedEdit.stock ?? (selected ? String(selected.stock) : "");

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SectionHeader
          eyebrow="ريف المدينة · ERP"
          title="المخزون والأسعار"
          description="ضبط لحظي لأسعار ومخزون SKUs السيادية. التغييرات تُحفظ دفعة واحدة عبر الـ Gateway."
          action={
            <Button
              type="button"
              onClick={saveAll}
              disabled={!dirtyCount || saving}
              className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-4 font-extrabold text-primary-foreground shadow-elevated hover:opacity-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-2 h-4 w-4" strokeWidth={2.4} />
              )}
              حفظ {dirtyCount || ""} تغيير
            </Button>
          }
        />

        <div className="glass-steel flex flex-col gap-2 rounded-3xl border border-white/40 p-3 shadow-soft sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في المنتجات..."
              className="h-11 w-full rounded-2xl border-white/40 bg-white/50 pe-10 ps-4 text-[13px] backdrop-blur-md focus-visible:ring-primary/40"
            />
          </div>
          <select
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="h-11 rounded-2xl border border-white/40 bg-white/50 px-3 text-[13px] font-bold backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">كل الأقسام</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <GlassTable<Row>
          data={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          loading={rows === null}
          onRowClick={(r) => openRow(r)}
          emptyState={
            <GlassEmptyState
              icon={PackageSearch}
              accent="info"
              title="لا توجد منتجات"
              description="لم نعثر على عناصر تطابق البحث الحالي. جرّب كلمة أخرى أو غيّر القسم."
            />
          }
        />
      </div>

      <GlassDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        eyebrow={selected ? selected.source : undefined}
        title={selected?.name}
        description={selected ? `الوحدة: ${selected.unit}` : undefined}
        size="max-w-md"
        footer={
          selected ? (
            <GlassDialogClose asChild>
              <Button
                type="button"
                className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-4 font-extrabold text-primary-foreground shadow-elevated hover:opacity-95"
              >
                تم
              </Button>
            </GlassDialogClose>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  السعر
                </span>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedPrice}
                  onChange={(e) =>
                    setEdit(selected.id, { price: e.target.value })
                  }
                  className="num mt-1 h-10 w-full border-0 bg-transparent p-0 text-end text-[16px] font-extrabold focus-visible:ring-0"
                />
              </label>
              <label className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                  المخزون
                </span>
                <Input
                  type="number"
                  value={selectedStock}
                  onChange={(e) =>
                    setEdit(selected.id, { stock: e.target.value })
                  }
                  className={cn(
                    "num mt-1 h-10 w-full border-0 bg-transparent p-0 text-end text-[16px] font-extrabold focus-visible:ring-0",
                    Number(selectedStock) <= 0 && "text-rose-600",
                    Number(selectedStock) > 0 &&
                      Number(selectedStock) < 20 &&
                      "text-amber-600",
                  )}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
              <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                <Boxes className="h-3.5 w-3.5" strokeWidth={2.4} />
                التفكيك المتداخل
              </p>
              <p className="mt-1 text-[13px] font-bold text-foreground/90">
                {loadingBreakdown
                  ? "جارٍ الاحتساب..."
                  : breakdown || "لا تتوفر وحدات متداخلة لهذا المنتج."}
              </p>
            </div>

            {edits[selected.id] && (
              <p className="text-[11.5px] font-bold text-amber-700">
                التعديل في الانتظار. اضغط «حفظ» في أعلى الصفحة لإرساله إلى الـ Gateway.
              </p>
            )}
          </div>
        )}
      </GlassDialog>
    </div>
  );
}
