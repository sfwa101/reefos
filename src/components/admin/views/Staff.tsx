import { useEffect, useState } from "react";
import { Users, ShieldCheck, Truck, Store, Plus } from "lucide-react";
import { UniversalAdminGrid, type BentoMetric, type Column, type RowAction } from "@/components/admin/UniversalAdminGrid";
import { fmtNum } from "@/lib/format";
import {
  listStaffProfilesFn,
  manageStaffRoleFn,
  assignRoleFn,
  revokeRoleFn,
  type StaffProfileRow,
} from "@/core/hr/hr.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const APP_ROLES = [
  "admin",
  "staff",
  "cashier",
  "store_manager",
  "collector",
  "delivery",
  "finance",
  "vendor",
] as const;
type AppRole = typeof APP_ROLES[number];

const ROLE_LABEL: Record<string, string> = {
  admin: "مدير",
  staff: "موظف",
  cashier: "كاشير",
  store_manager: "مدير متجر",
  collector: "محصل",
  delivery: "مندوب توصيل",
  finance: "مالية",
  vendor: "تاجر",
  super_admin: "مدير عام",
  branch_manager: "مدير فرع",
  driver: "مندوب",
  inventory_clerk: "أمين مخزن",
  user: "عميل",
};

const ROLE_TONE: Record<string, string> = {
  admin: "bg-primary/15 text-primary",
  staff: "bg-muted text-foreground",
  cashier: "bg-warning/15 text-warning",
  store_manager: "bg-info/15 text-info",
  collector: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]",
  delivery: "bg-[hsl(var(--purple))]/15 text-[hsl(var(--purple))]",
  finance: "bg-success/15 text-success",
  vendor: "bg-[hsl(var(--teal))]/15 text-[hsl(var(--teal))]",
};

type Profile = StaffProfileRow;

export default function StaffAdmin() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  const [editing, setEditing] = useState<{ id?: string; user_id?: string; role?: AppRole; is_active?: boolean } | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileQuery, setProfileQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing || editing.id) return;
    let alive = true;
    (async () => {
      try {
        const rows = await listStaffProfilesFn();
        if (alive) setProfiles(rows);
      } catch (e) {
        if (alive) toast.error((e as Error).message);
      }
    })();
    return () => { alive = false; };
  }, [editing]);

  type RoleRow = {
    id: string;
    user_id: string;
    role: string;
    is_active: boolean;
    created_at: string;
    branch_id: string | null;
  };

  const onAdd = () => setEditing({ role: "staff", is_active: true });
  const onEdit = (r: RoleRow) => setEditing({ id: r.id, user_id: r.user_id, role: r.role as AppRole, is_active: r.is_active });

  const onDelete = async (r: RoleRow) => {
    if (!confirm(`حذف دور ${ROLE_LABEL[r.role] ?? r.role}؟`)) return;
    try {
      await revokeRoleFn({ data: { role_id: r.id, role: r.role } });
      toast.success("تم الحذف");
      refresh();
    } catch (e) {
      toast.error("فشل الحذف: " + (e as Error).message);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.role || !APP_ROLES.includes(editing.role)) return toast.error("اختر دوراً صحيحاً");

    setSaving(true);
    try {
      if (editing.id) {
        await manageStaffRoleFn({ data: {
          action: "update", role: editing.role, role_id: editing.id,
          user_id: editing.user_id, is_active: editing.is_active ?? true,
        } });
        toast.success("تم تحديث الدور");
      } else {
        if (!editing.user_id) { toast.error("اختر المستخدم"); setSaving(false); return; }
        await assignRoleFn({ data: { user_id: editing.user_id, role: editing.role } });
        toast.success("تم إسناد الدور");
      }
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profileQuery.trim()
    ? profiles.filter((p) =>
        (p.full_name ?? "").toLowerCase().includes(profileQuery.toLowerCase()) ||
        (p.phone ?? "").includes(profileQuery) ||
        p.id.includes(profileQuery)
      )
    : profiles;

  const metrics: BentoMetric<RoleRow>[] = [
    { key: "total", label: "إجمالي الموظفين", icon: Users, tone: "primary",
      compute: (rows) => fmtNum(rows.filter((r) => r.is_active).length) },
    { key: "delivery", label: "التوصيل", icon: Truck, tone: "purple",
      compute: (rows) => fmtNum(rows.filter((r) => ["delivery","driver","collector"].includes(r.role)).length) },
    { key: "cashiers", label: "الكاشيرز", icon: Store, tone: "warning",
      compute: (rows) => fmtNum(rows.filter((r) => r.role === "cashier").length) },
    { key: "managers", label: "المدراء", icon: ShieldCheck, tone: "info",
      compute: (rows) => fmtNum(rows.filter((r) => ["admin","store_manager","branch_manager","super_admin","finance"].includes(r.role)).length) },
  ];

  const columns: Column<RoleRow>[] = [
    { key: "user_id", className: "flex-1", render: (r) => (
      <>
        <p className="text-[13px] font-mono">{String(r.user_id).slice(0, 8)}…</p>
        <p className="text-[11px] text-foreground-tertiary">منذ {new Date(r.created_at).toLocaleDateString("ar-EG")}</p>
      </>
    ) },
    { key: "role", className: "shrink-0", render: (r) => (
      <span className={`text-[10.5px] px-2 py-1 rounded-full font-semibold ${ROLE_TONE[r.role] ?? "bg-muted text-foreground-secondary"}`}>
        {ROLE_LABEL[r.role] ?? r.role}
      </span>
    ) },
    { key: "is_active", className: "shrink-0", hideOnMobile: true, render: (r) => (
      <span className={`text-[10.5px] px-2 py-1 rounded-full font-semibold ${r.is_active ? "bg-success/15 text-success" : "bg-muted text-foreground-tertiary"}`}>
        {r.is_active ? "نشط" : "موقوف"}
      </span>
    ) },
  ];

  const rowActions: RowAction<RoleRow>[] = [
    { label: "تعديل", onClick: onEdit },
    { label: "حذف", tone: "destructive", onClick: onDelete },
  ];

  return (
    <>
      <UniversalAdminGrid<RoleRow>
        key={refreshKey}
        title="الموظفون"
        subtitle="إدارة أدوار وصلاحيات النظام"
        dataSource={{
          table: "user_roles",
          select: "id,user_id,role,is_active,created_at,branch_id",
          orderBy: { column: "created_at", ascending: false },
          searchKeys: ["role", "user_id"],
        }}
        metrics={metrics}
        topSlot={
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> إسناد دور
            </Button>
          </div>
        }
        columns={columns}
        rowActions={rowActions}
        searchPlaceholder="ابحث بالدور أو user_id..."
        empty={{ title: "لا يوجد موظفون", hint: "اضغط 'إسناد دور' لإضافة موظف." }}
      />

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-card border border-border p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold">{editing.id ? "تعديل دور" : "إسناد دور لمستخدم"}</h2>

            {!editing.id && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">المستخدم</label>
                <Input
                  type="text"
                  placeholder="ابحث بالاسم/الهاتف/المعرف..."
                  value={profileQuery}
                  onChange={(e) => setProfileQuery(e.target.value)}
                  className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                />
                <select
                  className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                  value={editing.user_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, user_id: e.target.value })}
                  size={6}
                >
                  <option value="">— اختر مستخدماً —</option>
                  {filteredProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? "بدون اسم"} — {p.phone ?? p.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">الدور</label>
              <select
                className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background"
                value={editing.role ?? ""}
                onChange={(e) => setEditing({ ...editing, role: e.target.value as AppRole })}
              >
                {APP_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]} ({r})</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              نشط
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                disabled={saving}
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 rounded border border-border text-sm"
              >إلغاء</Button>
              <Button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
              >{saving ? "جاري الحفظ..." : "حفظ"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
