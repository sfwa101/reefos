/**
 * Phase 65 — Contextual Capability Engine (client hook).
 *
 * `useCapabilities()` loads the current user's full capability set, scoped to
 * the active workspace from `useSovereignContext`. It also resolves and
 * caches the workspace_id by hydrating `my_workspaces()` if needed.
 *
 * `useCapability(cap)` returns boolean for a single capability with a
 * backwards-compatible legacy-role fallback (admins always pass).
 *
 * Design intent: NEVER throw, always return a stable boolean. UI gates can
 * call this in render without `Suspense`.
 */
import { useEffect, useMemo, useState } from "react";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  useSovereignContext,
  type WorkspaceKind,
} from "@/core/capabilities/store/useSovereignContext";

type WorkspaceRow = {
  id: string;
  kind: WorkspaceKind;
  label: string;
  theme_overlay: Record<string, unknown>;
};

type CapState = {
  capabilities: Set<string>;
  workspaces: WorkspaceRow[];
  activeWorkspaceId: string | null;
  loading: boolean;
};

const ADMIN_BYPASS: ReadonlySet<string> = new Set(["admin"]);

export function useCapabilities(): CapState {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles();
  const {
    activeWorkspaceId,
    activeWorkspaceKind,
    setActiveWorkspace,
  } = useSovereignContext();

  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // 1) Hydrate workspaces (and project caps from roles on first call).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspaces([]);
      setCapabilities(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      // Project legacy roles into capabilities (idempotent).
      await IdentityGateway.syncCapabilitiesFromRoles(user.id);

      const ws = await IdentityGateway.listMyWorkspaces<WorkspaceRow>();
      if (cancelled) return;
      const rows = ws as WorkspaceRow[];
      setWorkspaces(rows);

      // Pick active workspace if not yet chosen.
      if (!activeWorkspaceId && rows.length > 0) {
        const preferred =
          rows.find((r) => r.kind === activeWorkspaceKind) ??
          rows.find((r) => r.kind === "global") ??
          rows[0];
        setActiveWorkspace(preferred.id, preferred.kind);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, activeWorkspaceId, activeWorkspaceKind, setActiveWorkspace]);

  // 2) Load capabilities for active workspace.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !activeWorkspaceId) {
      setCapabilities(new Set());
      setLoading(authLoading || rolesLoading);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await (supabase
        .from("user_capabilities" as never) as unknown as {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => Promise<{ data: Array<{ capability: string; expires_at: string | null }> | null }>;
          };
        };
      })
        .select("capability, expires_at")
        .eq("user_id", user.id)
        .eq("workspace_id", activeWorkspaceId);
      if (cancelled) return;
      const now = Date.now();
      const set = new Set<string>(
        (data ?? [])
          .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now)
          .map((r) => r.capability),
      );
      setCapabilities(set);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, rolesLoading, activeWorkspaceId]);

  return useMemo(
    () => ({
      capabilities,
      workspaces,
      activeWorkspaceId,
      loading: authLoading || rolesLoading || loading,
    }),
    [capabilities, workspaces, activeWorkspaceId, authLoading, rolesLoading, loading],
  );
}

export function useCapability(cap: string): { allowed: boolean; loading: boolean } {
  const { capabilities, loading } = useCapabilities();
  const { roles } = useUserRoles();
  // Admin bypass — RLS already enforces this server-side via has_capability.
  const isAdmin = roles.some((r) => ADMIN_BYPASS.has(r as string));
  return { allowed: isAdmin || capabilities.has(cap), loading };
}

/** Legacy bridge: map a legacy role name to a domain-namespaced capability. */
export function capForRole(role: string, domain: "reef" | "tayseer" | "global" = "global"): string {
  return `${domain}.${role}`;
}
