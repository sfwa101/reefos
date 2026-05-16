/**
 * Khalil — Coach fallback (P2.6 §11).
 *
 * Deterministic quiet-day proposal. Used when:
 *   - AI gateway is unreachable
 *   - Provider response fails strict schema validation
 *   - Copy key is not in the allowlist
 *
 * Pure: no I/O, no Date.now(), no randomness.
 */
import type { CoachProposalDraft } from "../schemas";
import { PROMPT_VERSION } from "./prompts.server";

export function buildQuietDayFallback(): CoachProposalDraft {
  return {
    kind: "quiet-day",
    copyKey: "khalil.coach.copy.quiet_day",
    payload: {
      copyKey: "khalil.coach.copy.quiet_day",
      bodyKey: "khalil.coach.body.quiet_day",
    },
    suggestedCapability: null,
    ttlSeconds: 60 * 60 * 6, // 6h — safe default
    promptVersion: PROMPT_VERSION,
  };
}
