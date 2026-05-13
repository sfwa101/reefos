import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type VendorProfile = {
  id: string;
  business_name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type CurrentVendor = {
  vendor: VendorProfile;
  role: string;
};

/**
 * Phase 9 — Identity hook for the multi-tenant Benaa SaaS layer.
 * Resolves the authenticated user's primary active vendor (tenant) and their role within it.
 */
export function useCurrentVendor() {
  const { user } = useAuth();

  return useQuery<CurrentVendor | null>({
    queryKey: ["current-vendor", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb
        .from("salsabil_vendor_members")
        .select("role, vendor:salsabil_vendors!inner(id, business_name, logo_url, is_active, created_at)")
        .eq("user_id", user!.id)
        .eq("vendor.is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.vendor) return null;
      return { vendor: data.vendor as VendorProfile, role: data.role as string };
    },
  });
}
