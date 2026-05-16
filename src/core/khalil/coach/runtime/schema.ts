/**
 * Khalil — Coach proposal schema runtime (P2.6 §3).
 *
 * Single sanctioned validator. Strips unknown fields, rejects invalid
 * capability intents, rejects arbitrary actions. Returns a tagged
 * verdict so callers can fall back deterministically.
 */
import {
  coachProposalDraftSchema,
  type CoachProposalDraft,
} from "../schemas";

export type ValidateDraftVerdict =
  | { ok: true; draft: CoachProposalDraft }
  | { ok: false; reason: string };

/**
 * Strict parse. Any deviation — unknown fields, illegal capability,
 * malformed intent — produces `ok: false`. Callers MUST switch to the
 * deterministic fallback proposal on rejection (Art. XI / §11).
 */
export function validateCoachProposalDraft(input: unknown): ValidateDraftVerdict {
  const parsed = coachProposalDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: parsed.error.issues[0]?.message ?? "invalid_draft",
    };
  }
  return { ok: true, draft: parsed.data };
}
