import { useEffect, useState } from "react";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { useAuth } from "@/context/AuthContext";

export type AppRole =
  | "admin" | "branch_manager" | "store_manager" | "finance"
  | "cashier" | "delivery" | "inventory_clerk" | "staff"
  | "collector" | "vendor" | null;

export type RoleInfo = {
  role: AppRole;
  branchId: string | null;
  loading: boolean;
};

const PRIORITY: Record<string, number> = {
  admin: 1, finance: 2, branch_manager: 3, store_manager: 4,
  inventory_clerk: 5, cashier: 6, delivery: 7, staff: 8,
  collector: 9, vendor: 10,
};

export function useUserRole(): RoleInfo {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null); setBranchId(null); setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await IdentityGateway.getActiveRolesWithBranch(user.id);
        if (cancelled) return;
        if (!data || data.length === 0) {
          setRole(null); setBranchId(null);
        } else {
          const sorted = [...data].sort(
            (a, b) => (PRIORITY[a.role as string] ?? 99) - (PRIORITY[b.role as string] ?? 99)
          );
          setRole(sorted[0].role as AppRole);
          setBranchId(sorted[0].branch_id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { role, branchId, loading: authLoading || loading };
}

/** Returns the home path that matches a given role. */
export function pathForRole(role: AppRole): string {
  switch (role) {
    case "cashier": return "/pos";
    case "delivery": return "/driver";
    case "inventory_clerk": return "/admin/inventory";
    case "branch_manager":
    case "store_manager":
    case "finance":
    case "admin": return "/admin";
    case "vendor": return "/vendor";
    case "staff": return "/employee";
    default: return "/";
  }
}
