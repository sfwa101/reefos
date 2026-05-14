/**
 * whoAmI — Wave P-7 Batch B.
 *
 * Sovereign Oracle: returns the server-attested workspace identity
 * derived from the authenticated JWT claim. The client never supplies
 * the workspace id; it is read exclusively from the middleware context.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireWorkspace } from "@/core/identity/workspace-middleware";

export type WhoAmIDTO = {
  userId: string;
  workspaceId: string;
};

export const whoAmI = createServerFn({ method: "GET" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<WhoAmIDTO> => {
    return {
      userId: context.userId,
      workspaceId: context.workspaceId,
    };
  });
