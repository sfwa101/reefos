/**
 * Khalil — Coach sub-domain barrel (P2.6).
 *
 * Public surface re-exported by `@/core/khalil`. Sub-domain internals
 * (runtime/, gateway/ files, prompts.server.ts) are NEVER imported
 * directly from UI.
 */
export { proposeCoachFn } from "./gateway/proposeCoach";
export { acceptCoachFn } from "./gateway/acceptCoach";
export { dismissCoachFn } from "./gateway/dismissCoach";
export { readCoachHistoryFn } from "./gateway/readCoachHistory";
export {
  coachProposalKindSchema,
  coachProposalStatusSchema,
  acceptCoachInputSchema,
  dismissCoachInputSchema,
  type CoachProposalKind,
  type CoachProposalStatus,
  type CoachProposalDTO,
  type CoachProposalPayload,
  type AcceptCoachInput,
  type DismissCoachInput,
} from "./schemas";
