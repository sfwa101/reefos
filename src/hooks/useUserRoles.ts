import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { AppRole } from "@/hooks/useUserRole";

const PRIORITY: Record<string, number> = {
  admin: 1, finance: 2, branch_manager: 3, store_manager: 4,
  inventory_clerk: 5, cashier: 6, delivery: 7, staff: 8,
  collector: 9, vendor: 10,
};

export type UserRolesInfo = {
  roles: NonNullable<AppRole>[];
  primary: AppRole;
  branchId: string | null;
  loading: boolean;
};

export function useUserRoles(): UserRolesInfo {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<NonNullable<AppRole>[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]); setBranchId(null); setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role, branch_id, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true);
        if (cancelled) return;
        const rows = (data ?? []) as Array<{ role: NonNullable<AppRole>; branch_id: string | null }>;
        const sorted = [...rows].sort(
          (a, b) => (PRIORITY[a.role] ?? 99) - (PRIORITY[b.role] ?? 99),
        );
        setRoles(sorted.map((r) => r.role));
        setBranchId(sorted[0]?.branch_id ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return {
    roles,
    primary: roles[0] ?? null,
    branchId,
    loading: authLoading || loading,
  };
}
