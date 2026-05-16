/**
 * Khalil — Coach read history gateway (P2.6 §10).
 *
 * Returns the latest pending proposal (if any) + a bounded slice of
 * recent terminal proposals for the audit-like history list on
 * `/khalil/coach`. RLS scopes to the caller.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import type { CoachProposalDTO } from "../schemas";

export const readCoachHistoryFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.COACH_PROPOSE_READ),
  ])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const nowIso = new Date().toISOString();

    const [{ data: pendingRow }, { data: historyRows }] = await Promise.all([
      supabase
        .from("khalil_coach_proposal")
        .select(
          "id,kind,status,copy_key,payload,suggested_capability,prompt_version,created_at,expires_at,accepted_at,dismissed_at",
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("khalil_coach_proposal")
        .select(
          "id,kind,status,copy_key,payload,suggested_capability,prompt_version,created_at,expires_at,accepted_at,dismissed_at",
        )
        .eq("user_id", userId)
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      pending: pendingRow ? toDto(pendingRow) : null,
      history: (historyRows ?? []).map(toDto),
    };
  });

function toDto(row: {
  id: string;
  kind: string;
  status: string;
  copy_key: string;
  payload: unknown;
  suggested_capability: string | null;
  prompt_version: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  dismissed_at: string | null;
}): CoachProposalDTO {
  return {
    id: row.id,
    kind: row.kind as CoachProposalDTO["kind"],
    status: row.status as CoachProposalDTO["status"],
    copyKey: row.copy_key,
    payload: row.payload as CoachProposalDTO["payload"],
    suggestedCapability:
      (row.suggested_capability as CoachProposalDTO["suggestedCapability"]) ?? null,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    dismissedAt: row.dismissed_at,
  };
}
