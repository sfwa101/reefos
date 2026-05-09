/**
 * TenantContext — Phase 41 Tenant Isolation Kernel (lightweight).
 *
 * Salsabil OS currently ships as a single-tenant deployment ("reef-al-madina").
 * This provider establishes the active `tenantId` as an immutable runtime
 * constant resolved from (in order):
 *
 *   1. `VITE_SALSABIL_TENANT_ID` build-time env
 *   2. Recognised public hostname/subdomain (e.g. `reef.*`, `*.reef.*`)
 *   3. Hard-coded `DEFAULT_TENANT` ("reef-al-madina")
 *
 * If the resolved tenant is not in `ALLOWED_TENANTS`, the entire app halts
 * behind an "Invalid Workspace" screen — we never default to a generic
 * cross-tenant query state.
 *
 * Consumers MUST read `useTenant()` and pass `tenantId` as the first segment
 * of every TanStack Query key (`tenantQueryKey`) and every storage path
 * (`tenantStoragePath`) so the IndexedDB cache and Supabase Storage are
 * partitioned by tenant by construction.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

const DEFAULT_TENANT = "reef-al-madina";
const ALLOWED_TENANTS = new Set<string>([
  "reef-al-madina",
]);

type TenantContextValue = {
  tenantId: string;
  tenantLabel: string;
};

const TenantContext = createContext<TenantContextValue | null>(null);

function resolveTenantId(): string {
  // 1. Build-time override.
  const envTenant = (import.meta.env.VITE_SALSABIL_TENANT_ID as string | undefined)?.trim();
  if (envTenant) return envTenant;

  // 2. Hostname-based detection (covers reefos.lovable.app + custom domains).
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("reef") || host.includes("salsabil")) return "reef-al-madina";
  }

  // 3. Hard-coded default.
  return DEFAULT_TENANT;
}

function InvalidWorkspaceScreen({ tenantId }: { tenantId: string }) {
  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <div className="max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-bold text-foreground">
          مساحة عمل غير صالحة
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground-secondary">
          لم نتمكن من التحقق من هوية مساحة العمل
          {tenantId ? ` (\u200E${tenantId}\u200E)` : ""}.
          الرجاء التواصل مع المسؤول.
        </p>
        <p className="mt-4 text-[10.5px] text-foreground-tertiary">
          Invalid Workspace — Tenant resolution failed.
        </p>
      </div>
    </div>
  );
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const value = useMemo<TenantContextValue | null>(() => {
    const tenantId = resolveTenantId();
    if (!tenantId || !ALLOWED_TENANTS.has(tenantId)) return null;
    return { tenantId, tenantLabel: tenantId };
  }, []);

  if (!value) return <InvalidWorkspaceScreen tenantId={resolveTenantId()} />;
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    // This should be unreachable because the provider gates rendering, but
    // we throw loudly so misuse outside the provider is caught immediately.
    throw new Error("useTenant() must be used inside <TenantProvider>");
  }
  return ctx;
}

/**
 * Synchronous tenant lookup for non-React contexts (query helpers, storage
 * uploaders, etc.). Resolves the same way as the provider so the value is
 * stable across React and non-React code.
 */
export function getActiveTenantId(): string {
  const id = resolveTenantId();
  return ALLOWED_TENANTS.has(id) ? id : DEFAULT_TENANT;
}
