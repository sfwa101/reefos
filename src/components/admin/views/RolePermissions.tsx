import { useCallback, useState } from "react";
import { ShieldCheck, Key, Users, Lock } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { getPermissionMatrixFn, togglePermissionFn, type AppRole } from "@/core/capabilities/rbac.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES: { key: AppRole; label: string }[] = [
  { key: "admin", label: "مدير" },
  { key: "staff", label: "موظف" },
  { key: "store_manager", label: "مدير متجر" },
  { key: "branch_manager", label: "مدير فرع" },
  { key: "cashier", label: "كاشير" },
  { key: "finance", label: "مالية" },
  { key: "inventory_clerk", label: "مخزون" },
  { key: "vendor", label: "بائع" },
  { key: "delivery", label: "توصيل" },
  { key: "collector", label: "مُحصِّل" },
  { key: "charity_auditor", label: "مدقق خيري" },
];

type Row = {
  id: string;
  key: string;
  label: string;
  group_name: string;
  granted: Set<AppRole>;
};

async function fetchMatrix(): Promise<Row[]> {
  const { matrix } = await getPermissionMatrixFn();
  return matrix.map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    group_name: p.group_name,
    granted: new Set<AppRole>(p.roles),
  }));
}

function MatrixRow({ row }: { row: Row }) {
  const [granted, setGranted] = useState<Set<AppRole>>(new Set(row.granted));
  const [busy, setBusy] = useState<AppRole | null>(null);

  const toggle = useCallback(async (role: AppRole) => {
    const has = granted.has(role);
    setBusy(role);
    try {
      await togglePermissionFn({ data: { role, permissionKey: row.key, granted: !has } });
      const next = new Set(granted);
      if (has) next.delete(role); else next.add(role);
      setGranted(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر تحديث الصلاحية");
    } finally {
      setBusy(null);
    }
  }, [granted, row.key]);

  return (
    <div className="px-4 lg:px-5 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="font-display text-[14px] truncate">{row.label}</p>
        <span className="text-[10.5px] text-foreground-tertiary shrink-0 font-mono">{row.key}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const on = granted.has(r.key);
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              disabled={busy === r.key}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border press transition",
                on ? "bg-primary text-primary-foreground border-primary"
                   : "bg-muted/40 text-foreground-tertiary border-border/40 hover:bg-muted",
                busy === r.key && "opacity-60",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RolePermissions() {
  return (
    <UniversalAdminGrid<Row>
      title="مصفوفة الصلاحيات"
      subtitle="أدر الصلاحيات الممنوحة لكل دور — اضغط على الدور للتفعيل/الإلغاء"
      metrics={[
        { key: "perms", label: "الصلاحيات", icon: Key, tone: "primary", compute: (r) => r.length },
        { key: "roles", label: "الأدوار", icon: Users, tone: "info", compute: () => ROLES.length },
        { key: "groups", label: "المجموعات", icon: Lock, tone: "purple",
          compute: (r) => new Set(r.map((x) => x.group_name)).size },
        { key: "shield", label: "الحماية", icon: ShieldCheck, tone: "success", compute: () => "نشطة" },
      ]}
      dataSource={{
        fetcher: fetchMatrix,
        searchKeys: ["key", "label", "group_name"],
      }}
      searchPlaceholder="بحث باسم الصلاحية أو المفتاح..."
      empty={{ icon: ShieldCheck, title: "لا توجد صلاحيات معرّفة",
        hint: "أضف صلاحيات إلى جدول permissions لتظهر هنا" }}
      renderList={(rows) => (
        <div>
          {rows.map((r) => <MatrixRow key={r.id} row={r} />)}
        </div>
      )}
    />
  );
}
