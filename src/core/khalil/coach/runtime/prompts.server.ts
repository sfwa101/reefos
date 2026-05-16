/**
 * Khalil — Coach prompt registry (server-only, P2.6 §4).
 *
 * IMPORTANT: This file MUST never appear in a client bundle. It is
 * imported only by server fns (`createServerFn`) under `coach/gateway/`.
 * The `.server.ts` suffix makes the bundler protection explicit.
 *
 * Prompts are:
 *   - Deterministic (no randomness, no timestamps in body)
 *   - Versioned (`PROMPT_VERSION`)
 *   - Consume ONLY the allowlisted snapshot shape
 *
 * The provider response is always re-validated through
 * `validateCoachProposalDraft`. We never trust the model output as
 * truth.
 */
import type { CoachSnapshot } from "./snapshot";

export const PROMPT_VERSION = "khalil.coach.v1";

const SYSTEM_PROMPT = `You are Khalil, a calm transformation companion.
Reply ONLY with a JSON object matching this exact shape (no prose, no markdown fences):

{
  "kind": "gentle-reminder" | "recovery-suggestion" | "pillar-rebalance-hint" | "consistency-guidance" | "quiet-day",
  "copyKey": "khalil.coach.copy.<id>",
  "payload": {
    "copyKey": "khalil.coach.copy.<id>",
    "bodyKey": "khalil.coach.body.<id>"
  },
  "suggestedCapability": null,
  "ttlSeconds": 3600,
  "promptVersion": "${PROMPT_VERSION}"
}

Hard rules:
- Never include free-form Arabic text. Use only i18n keys from the allowed registry.
- Allowed i18n keys: khalil.coach.copy.calm_breath, khalil.coach.copy.gentle_return,
  khalil.coach.copy.one_small_step, khalil.coach.copy.rest_today, khalil.coach.copy.steady_pace,
  khalil.coach.copy.quiet_day.
- Use "quiet-day" when adherence is high or identity level is sovereign.
- Use "recovery-suggestion" only when adherence is low AND recovery is off.
- Use "consistency-guidance" for stable/rising identity levels.
- Use "gentle-reminder" for seed level.
- Output MUST be a single JSON object with no additional fields.`;

export interface BuiltPrompt {
  system: string;
  user: string;
  promptVersion: string;
}

export function buildCoachPrompt(snapshot: CoachSnapshot): BuiltPrompt {
  // Deterministic projection — no randomness, no timestamps in body.
  const userPayload = {
    identityLevel: snapshot.identityLevel,
    recovery: snapshot.recovery,
    adherence: {
      combined: Math.round(snapshot.adherence.combinedScore * 100) / 100,
      prayer: Math.round(snapshot.adherence.prayerScore * 100) / 100,
      habit: Math.round(snapshot.adherence.habitScore * 100) / 100,
    },
    activePillars: [...snapshot.activePillars].sort(),
    recentProposalKinds: [...snapshot.recentProposalKinds].slice(-3),
  };
  return {
    system: SYSTEM_PROMPT,
    user: JSON.stringify(userPayload),
    promptVersion: PROMPT_VERSION,
  };
}

/**
 * Allowed copy keys. Anything outside this list is rejected at the
 * runtime/schema layer — we never render arbitrary model strings.
 */
export const ALLOWED_COPY_KEYS: ReadonlySet<string> = new Set([
  "khalil.coach.copy.calm_breath",
  "khalil.coach.copy.gentle_return",
  "khalil.coach.copy.one_small_step",
  "khalil.coach.copy.rest_today",
  "khalil.coach.copy.steady_pace",
  "khalil.coach.copy.quiet_day",
]);
