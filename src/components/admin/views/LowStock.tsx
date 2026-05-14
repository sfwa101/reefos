import { useEffect, useState } from "react";
import { listLowStockProductsFn, type LowStockItem } from "@/core/ops/ops.functions";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { Loader2, AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = LowStockItem;

export default function LowStock() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("store_manager");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(5);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setLoading(true);
    listLowStockProductsFn({ data: { threshold } })
      .then((data) => { if (!cancelled) { setItems(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setItems([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [threshold, allowed]);

  if (rolesLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!allowed) return <div className="p-8 text-center text-destructive">للأدمن أو المدير فقط</div>;

  return (
    <>
      <MobileTopbar title="تنبيهات المخزون" />
      <div className="px-4 lg:px-6 pt-3 pb-6 max-w-3xl mx-auto space-y-4">
        <div className="bg-surface rounded-2xl p-4 border border-border/40 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--accent))]" />
          <div className="flex-1 text-sm">منتجات وصلت للحد الحرج</div>
          <div className="w-24">
            <Label className="text-[10px]">الحد</Label>
            <Input type="number" min={1} max={100} value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value) || 5)} className="h-8" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></div>
        ) : !items.length ? (
          <div className="bg-surface rounded-2xl p-8 text-center border border-border/40">
            <Package className="mx-auto h-10 w-10 text-foreground-tertiary mb-2" />
            <p className="text-foreground-secondary">المخزون بحالة جيدة 👌</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(p => {
              const critical = p.stock === 0;
              return (
                <div key={p.id} className={`bg-surface rounded-2xl p-3 border flex items-center gap-3 ${critical ? "border-destructive/60" : "border-border/40"}`}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-foreground-tertiary">{p.category} • {p.price} ج.م</p>
                  </div>
                  <div className={`text-center shrink-0 ${critical ? "text-destructive" : "text-[hsl(var(--accent))]"}`}>
                    <div className="font-display text-lg">{p.stock}</div>
                    <div className="text-[10px]">{critical ? "نفد" : "متبقي"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
