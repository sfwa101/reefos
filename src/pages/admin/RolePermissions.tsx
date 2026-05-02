import { useCallback, useState } from "react";
import { ShieldCheck, Key, Users, Lock } from "lucide-react";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AppRole = Database["public"]["Enums"]["app_role"];

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
  const [permsRes, mapRes] = await Promise.all([
    supabase.from("permissions").select("id,key,label,group_name").order("group_name").order("key"),
    supabase.from("role_permissions").select("role,permission_key"),
  ]);
  if (permsRes.error) throw permsRes.error;
  if (mapRes.error) throw mapRes.error;
  const grants = new Map<string, Set<AppRole>>();
  for (const m of mapRes.data ?? []) {
    const set = grants.get(m.permission_key) ?? new Set<AppRole>();
    set.add(m.role as AppRole);
    grants.set(m.permission_key, set);
  }
  return (permsRes.data ?? []).map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    group_name: p.group_name,
    granted: grants.get(p.key) ?? new Set<AppRole>(),
  }));
}

function MatrixRow({ row }: { row: Row }) {
  const [granted, setGranted] = useState<Set<AppRole>>(new Set(row.granted));
  const [busy, setBusy] = useState<AppRole | null>(null);

  const toggle = useCallback(async (role: AppRole) => {
    const has = granted.has(role);
    setBusy(role);
    try {
      if (has) {
        const { error } = await supabase.from("role_permissions")
          .delete().eq("role", role).eq("permission_key", row.key);
        if (error) throw error;
        const next = new Set(granted); next.delete(role); setGranted(next);
      } else {
        const { error } = await supabase.from("role_permissions")
          .insert({ role, permission_key: row.key });
        if (error) throw error;
        const next = new Set(granted); next.add(role); setGranted(next);
      }
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
          compute: (r) => new Set(r.map((x: any) => x.group_name)).size },
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
