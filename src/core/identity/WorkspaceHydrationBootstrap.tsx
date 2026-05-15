/**
 * WorkspaceHydrationBootstrap — Wave P-7 Batch B.
 *
 * Headless mount that calls the sovereign `whoAmI` server fn whenever
 * the authenticated user changes, then writes the server-attested
 * workspace id into the in-memory store at `@/core/identity/workspace`.
 *
 * Runs in parallel with the legacy <TenantProvider> until Batch E.
 */
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { whoAmI } from "@/core/identity/whoami.functions";
import { hydrateWorkspaceId } from "@/core/identity/workspace";
import { Tracer } from "@/core/system/observability/Tracer";

export const WorkspaceHydrationBootstrap = (): null => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    whoAmI()
      .then((dto) => {
        if (cancelled) return;
        hydrateWorkspaceId(dto.workspaceId);
      })
      .catch((err) => {
        // 401 expected until the custom_access_token_hook is enabled
        // in Cloud → Auth Settings. Log once, do not crash the app.
        Tracer.warn("identity", "workspacehydration_whoami_failed", { args: ["[WorkspaceHydration] whoAmI failed", err] });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
};
