/** useAdminNavigation — hierarchical sidebar tree (cached 5min). */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminNavItem {
  id: string;
  parent_id: string | null;
  entity_id: string | null;
  label_i18n: Record<string, string>;
  icon: string | null;
  role_required: string | null;
  sort_order: number;
  is_visible: boolean;
  children?: AdminNavItem[];
}

function buildTree(rows: AdminNavItem[]): AdminNavItem[] {
  const map = new Map<string, AdminNavItem>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: AdminNavItem[] = [];
  for (const r of map.values()) {
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children!.push(r);
    } else {
      roots.push(r);
    }
  }
  return roots;
}

export function useAdminNavigation() {
  return useQuery({
    queryKey: ["admin", "navigation"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_navigation")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order");
      if (error) throw error;
      return buildTree((data ?? []) as AdminNavItem[]);
    },
  });
}
