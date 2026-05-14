import { useQuery } from "@tanstack/react-query";
import { VendorGateway } from "@/core/vendor/gateway/VendorGateway";
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
      const data = await VendorGateway.getCurrentVendorMembership(user!.id);
      if (!data) return null;
      return { vendor: data.vendor as VendorProfile, role: data.role };
    },
  });
}
