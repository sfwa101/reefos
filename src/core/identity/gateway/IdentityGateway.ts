/**
 * IdentityGateway — Sovereign Identity & Auth boundary (Wave B-1).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §2 + §3):
 *   • This file is one of the few permitted to import the Supabase client.
 *   • UI / hooks / components MUST consume IdentityGateway only.
 *   • Returns typed VMs, never raw Supabase rows.
 *
 * Scope (B-1):
 *   - getCurrentUserId(): replaces every `supabase.auth.getUser()` in UI.
 *   - getActiveRoles():   replaces every `supabase.from("user_roles")` in UI.
 *   - getPrimaryRole():   role-priority resolution previously inlined in Auth.tsx.
 *
 * Future waves (B-2+) will extend this gateway with profile reads, family
 * graph, and KYC flows — each absorbing a specific cluster of violations
 * mapped in PURIFICATION_WAVE_A_REPORT.md §5.
 */
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "staff"
  | "cashier"
  | "store_manager"
  | "collector"
  | "delivery"
  | "finance"
  | "vendor"
  | "branch_manager"
  | "inventory_clerk";

const ROLE_PRIORITY: Record<string, number> = {
  admin: 1,
  finance: 2,
  branch_manager: 3,
  store_manager: 4,
  inventory_clerk: 5,
  cashier: 6,
  delivery: 7,
  staff: 8,
  collector: 9,
  vendor: 10,
};

export const IdentityGateway = {
  /**
   * Returns the current authenticated user id or null. Never throws.
   * Replaces every direct `supabase.auth.getUser()` in UI surfaces.
   */
  async getCurrentUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Active role list for a user. Empty array on failure or anonymous.
   * Replaces direct `user_roles` reads in `RoleGuard` and `Auth.tsx`.
   */
  async getActiveRoles(userId: string): Promise<AppRole[]> {
    if (!userId) return [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("user_roles")
        .select("role, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);
      return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
    } catch {
      return [];
    }
  },

  /**
   * Highest-priority active role, used for post-login redirect routing.
   */
  async getPrimaryRole(userId: string): Promise<AppRole | null> {
    const roles = await IdentityGateway.getActiveRoles(userId);
    if (roles.length === 0) return null;
    const sorted = [...roles].sort(
      (a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99),
    );
    return sorted[0] ?? null;
  },
};
