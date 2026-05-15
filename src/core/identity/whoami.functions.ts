/**
 * whoAmI — Wave P-7 Batch B (hardened).
 *
 * Sovereign Oracle: returns the server-attested workspace identity
 * derived from the authenticated JWT claim. The client never supplies
 * the workspace id; it is read exclusively from the verified token.
 *
 * NOTE: This intentionally uses `requireSupabaseAuth` (NOT
 * `requireWorkspace`) so that a missing `workspace_id` claim returns
 * `{ workspaceId: null }` instead of throwing a 401 `Response` —
 * which would otherwise surface as an unhandled runtime error in the
 * client overlay during hydration.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WhoAmIDTO = {
  userId: string;
  workspaceId: string | null;
};

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

export const whoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhoAmIDTO> => {
    return {
      userId: context.userId,
      workspaceId: extractWorkspaceId(context.claims),
    };
  });
