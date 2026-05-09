/**
 * useSovereignOverride — Phase 55.
 *
 * Returns true when the current user holds the `admin` role. Master Admins
 * are sovereign: they bypass KYC walls, persona-level redirects, and
 * approval banners. UI surfaces should call this and short-circuit any
 * gating logic when it returns true.
 */
import { useUserRoles } from "@/hooks/useUserRoles";

export const useSovereignOverride = (): boolean => {
  const { roles } = useUserRoles();
  return roles.includes("admin");
};
