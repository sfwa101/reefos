/**
 * Sovereign Workspace Middleware — Wave P-7 Batch A.
 *
 * Composes on top of `requireSupabaseAuth` (which is auto-generated and
 * must not be edited) to extract the server-attested `workspace_id`
 * claim injected by the `custom_access_token_hook` Postgres function.
 *
 * Downstream `createServerFn` handlers receive `context.workspaceId`
 * as a strictly typed string. Requests whose JWT lacks the claim are
 * rejected with HTTP 401 — there is no client fallback by design.
 */
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ClaimsShape = {
  workspace_id?: unknown;
  app_metadata?: { workspace_id?: unknown } | null;
  user_metadata?: { workspace_id?: unknown } | null;
};

function extractWorkspaceId(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") return null;
  const c = claims as ClaimsShape;
  const candidates: ReadonlyArray<unknown> = [
    c.workspace_id,
    c.app_metadata?.workspace_id,
    c.user_metadata?.workspace_id,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export const requireWorkspace = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const workspaceId = extractWorkspaceId(context.claims);
    if (!workspaceId) {
      throw new Response(
        "Unauthorized: token is missing workspace_id claim",
        { status: 401 },
      );
    }
    return next({ context: { workspaceId } });
  });
