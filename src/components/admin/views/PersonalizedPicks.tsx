import { Flame, Gift, Percent, Sparkles, Wand2 } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";

interface PickRow {
  id: string;
  flash_sale_id: string;
  product_id: string;
  product_name: string | null;
  original_price: number;
  discount_pct: number;
  reason: string | null;
  category: string | null;
  rank: number;
  created_at: string;
}

/**
 * Personalized Flash Picks — مراقبة العروض الشخصية المولدة بواسطة حكيم
 * Source: flash_sale_products (offers crafted from category_affinity & behavior).
 */
export default function PersonalizedPicks() {
  return (
    <UniversalAdminGrid<PickRow>
      title="العروض المخصصة — Personalized Picks"
      subtitle="عروض حكيم الذكية المولّدة من سلوك العملاء"
      dataSource={{
        table: "flash_sale_products",
        select: "id,flash_sale_id,product_id,product_name,original_price,discount_pct,reason,category,rank,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 300,
        searchKeys: ["product_name", "category", "reason", "product_id"],
      }}
      metrics={[
        {
          key: "total",
          label: "عروض نشطة",
          icon: Flame,
          tone: "accent",
          compute: (rows) => fmtNum(rows.length),
        },
        {
          key: "avgDiscount",
          label: "متوسط الخصم",
          icon: Percent,
          tone: "warning",
          compute: (rows) => {
            if (!rows.length) return "0%";
            const avg = rows.reduce((s, r) => s + Number(r.discount_pct ?? 0), 0) / rows.length;
            return `${avg.toFixed(1)}%`;
          },
        },
        {
          key: "savings",
          label: "إجمالي الوفر للعملاء",
          icon: Gift,
          tone: "success",
          compute: (rows) =>
            fmtMoney(
              rows.reduce((s, r) => s + Number(r.original_price ?? 0) * (Number(r.discount_pct ?? 0) / 100), 0),
            ),
        },
        {
          key: "categories",
          label: "فئات مغطّاة",
          icon: Sparkles,
          tone: "purple",
          compute: (rows) => fmtNum(new Set(rows.map((r) => r.category).filter(Boolean)).size),
        },
      ]}
      columns={[
        {
          key: "main",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold bg-accent/15 text-accent num">
                  -{Number(r.discount_pct ?? 0).toFixed(0)}%
                </span>
                <p className="font-display text-[13.5px] truncate">
                  {r.product_name ?? `#${r.product_id.slice(0, 10)}`}
                </p>
              </div>
              <p className="text-[11.5px] text-foreground-secondary truncate">
                {r.category ?? "بدون فئة"} • سعر أصلي: {fmtMoney(r.original_price)}
              </p>
              {r.reason && <p className="text-[10.5px] text-foreground-tertiary truncate">سبب الترشيح: {r.reason}</p>}
            </div>
          ),
        },
        {
          key: "meta",
          className: "shrink-0 text-left",
          hideOnMobile: true,
          render: (r) => (
            <div className="text-[11px] num text-foreground-secondary text-left">
              <p>ترتيب: {r.rank}</p>
              <p className="text-foreground-tertiary">{fmtRelative(r.created_at)}</p>
            </div>
          ),
        },
      ]}
      empty={{
        icon: Wand2,
        title: "لا توجد ترشيحات شخصية بعد",
        hint: "سيقوم حكيم بتوليد العروض حال توفر بيانات سلوك كافية.",
      }}
    />
  );
}
