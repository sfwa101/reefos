// RBAC Gateway — Wave P-D · Phase D-8.
// Role/permission matrix served + mutated through `requireAdmin` server fns.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type PermissionRow = {
  id: string;
  key: string;
  label: string;
  group_name: string;
};

export type RolePermissionRow = {
  role: AppRole;
  permission_key: string;
};

export type PermissionMatrixRow = PermissionRow & { roles: AppRole[] };

export type PermissionMatrix = {
  permissions: PermissionRow[];
  grants: RolePermissionRow[];
  matrix: PermissionMatrixRow[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

export const listPermissionsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<PermissionRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("permissions")
      .select("id, key, label, group_name")
      .order("group_name", { ascending: true })
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PermissionRow[];
  });

export const listRolePermissionsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<RolePermissionRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("role_permissions")
      .select("role, permission_key");
    if (error) throw new Error(error.message);
    return (data ?? []) as RolePermissionRow[];
  });

export const getPermissionMatrixFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<PermissionMatrix> => {
    const sb = context.supabase as SbAny;
    const [permsRes, mapRes] = await Promise.all([
      sb
        .from("permissions")
        .select("id, key, label, group_name")
        .order("group_name", { ascending: true })
        .order("key", { ascending: true }),
      sb.from("role_permissions").select("role, permission_key"),
    ]);
    if (permsRes.error) throw new Error(permsRes.error.message);
    if (mapRes.error) throw new Error(mapRes.error.message);

    const permissions = (permsRes.data ?? []) as PermissionRow[];
    const grants = (mapRes.data ?? []) as RolePermissionRow[];

    const grantMap = new Map<string, AppRole[]>();
    for (const g of grants) {
      const list = grantMap.get(g.permission_key) ?? [];
      list.push(g.role);
      grantMap.set(g.permission_key, list);
    }

    const matrix: PermissionMatrixRow[] = permissions.map((p) => ({
      ...p,
      roles: grantMap.get(p.key) ?? [],
    }));

    return { permissions, grants, matrix };
  });

export const togglePermissionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { role: AppRole; permissionKey: string; granted: boolean }) => {
    if (!d?.role) throw new Error("invalid_role");
    if (!d?.permissionKey) throw new Error("invalid_permission");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    if (data.granted) {
      const { error } = await sb
        .from("role_permissions")
        .insert({ role: data.role, permission_key: data.permissionKey });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("role_permissions")
        .delete()
        .eq("role", data.role)
        .eq("permission_key", data.permissionKey);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const, granted: data.granted };
  });
