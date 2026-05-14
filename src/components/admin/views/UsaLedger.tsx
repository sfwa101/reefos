/**
 * UsaLedger — Phase 7 Part 4 USA Nexus.
 * Pure Universal Salsabil Asset ledger powered by UniversalAdminGrid.
 * Reads salsabil_assets joined with salsabil_skus + salsabil_financial_contracts.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Layers, Wrench, Pencil, Boxes, Plus } from "lucide-react";
import { UniversalAdminGrid, type BentoMetric, type Column, type RowAction } from "@/components/admin/UniversalAdminGrid";
import USAEditor, { type USARecord } from "@/apps/reef-al-madina/features/admin/usa-editor/USAEditor";
import { fmtMoney, fmtNum } from "@/lib/format";

const ASSET_TYPE_LABEL: Record<string, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
  rental: "إيجار",
  milestone_project: "مشروع بمراحل",
};

const ASSET_TYPE_TONE: Record<string, string> = {
  physical: "bg-primary/10 text-primary",
  digital: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  service: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  rental: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  milestone_project: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
};

interface RawContract {
  base_price: number;
  currency: string;
  pricing_model: string;
  is_active: boolean;
  valid_from: string;
}
interface RawAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  traits: unknown;
  is_active: boolean;
  created_at: string;
  salsabil_skus?: Array<{
    id: string;
    salsabil_financial_contracts?: RawContract[] | null;
  }> | null;
}

export default function UsaLedger() {
  const [editing, setEditing] = useState<USARecord | null>(null);

  const metrics = useMemo<BentoMetric<USARecord>[]>(
    () => [
      {
        key: "total",
        label: "إجمالي الأصول",
        icon: Layers,
        tone: "primary",
        compute: (rows) => fmtNum(rows.length),
      },
      {
        key: "physical",
        label: "أصول مادية",
        icon: Boxes,
        tone: "info",
        compute: (rows) => fmtNum(rows.filter((r) => r.asset_type === "physical").length),
      },
      {
        key: "service",
        label: "خدمات",
        icon: Wrench,
        tone: "success",
        compute: (rows) => fmtNum(rows.filter((r) => r.asset_type === "service").length),
      },
    ],
    [],
  );

  const columns = useMemo<Column<USARecord>[]>(
    () => [
      {
        key: "name",
        label: "الأصل",
        className: "flex-[2] min-w-0",
        render: (row) => (
          <div className="min-w-0">
            <p className="font-semibold text-[13.5px] truncate">{row.name}</p>
            {row.description && (
              <p className="text-[11px] text-foreground-tertiary truncate">{row.description}</p>
            )}
          </div>
        ),
      },
      {
        key: "asset_type",
        label: "النوع",
        className: "flex-1",
        render: (row) => (
          <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${ASSET_TYPE_TONE[row.asset_type] ?? "bg-muted text-foreground-secondary"}`}>
            {ASSET_TYPE_LABEL[row.asset_type] ?? row.asset_type}
          </span>
        ),
      },
      {
        key: "base_price",
        label: "السعر",
        className: "flex-1",
        hideOnMobile: true,
        render: (row) =>
          row.base_price != null ? (
            <span className="font-display num text-[13.5px]">
              {fmtMoney(row.base_price)} <span className="text-[10px] text-foreground-tertiary">{row.currency ?? "EGP"}</span>
            </span>
          ) : (
            <span className="text-foreground-tertiary text-[12px]">—</span>
          ),
      },
      {
        key: "skus_count",
        label: "SKUs",
        className: "w-16",
        hideOnMobile: true,
        render: (row) => <span className="num text-[12.5px] font-semibold">{fmtNum(row.skus_count ?? 0)}</span>,
      },
      {
        key: "created_at",
        label: "أُنشئ",
        className: "flex-1",
        hideOnMobile: true,
        render: (row) => (
          <span className="text-[11.5px] text-foreground-tertiary">
            {new Date(row.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<USARecord>[]>(
    () => [
      { label: "تعديل", icon: Pencil, onClick: (row) => setEditing(row) },
    ],
    [],
  );

  return (
    <>
      <UniversalAdminGrid<USARecord>
        title="الأصول العالمية (USA Nexus)"
        subtitle="السجل الموحّد للأصول · منتجات · خدمات · إيجارات · مشاريع بمراحل"
        metrics={metrics}
        columns={columns}
        rowActions={rowActions}
        searchPlaceholder="ابحث باسم أو وصف الأصل…"
        empty={{
          icon: Sparkles,
          title: "لا توجد أصول بعد",
          hint: "افتح بوابة التكوين الذكي وارفع صورة لتوليد أول أصل عالمي.",
        }}
        topSlot={
          <Link
            to="/admin/assets/genesis"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[13px] font-extrabold press shadow-soft"
          >
            <Plus className="h-4 w-4" />
            تكوين أصل جديد بالذكاء البصري
          </Link>
        }
        dataSource={{
          table: "salsabil_assets",
          select: "id,name,description,asset_type,traits,is_active,created_at,salsabil_skus(id,salsabil_financial_contracts(base_price,currency,pricing_model,is_active,valid_from))",
          orderBy: { column: "created_at", ascending: false },
          searchKeys: ["name", "description"],
          map: (rawRow: unknown): USARecord => {
            const raw = rawRow as RawAsset;
            const allContracts: RawContract[] = (raw.salsabil_skus ?? [])
              .flatMap((s) => s.salsabil_financial_contracts ?? []);
            const activeContract = allContracts
              .filter((c) => c.is_active)
              .sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime())[0];
            return {
              id: raw.id,
              name: raw.name,
              description: raw.description,
              asset_type: raw.asset_type,
              traits: raw.traits,
              is_active: raw.is_active,
              created_at: raw.created_at,
              base_price: activeContract?.base_price ?? null,
              currency: activeContract?.currency ?? null,
              pricing_model: activeContract?.pricing_model ?? null,
              skus_count: raw.salsabil_skus?.length ?? 0,
            };
          },
        }}
        rowKey={(row) => row.id}
        onRowClick={(row) => setEditing(row)}
      />

      <USAEditor
        open={!!editing}
        asset={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
