/**
 * Khalil — Recovery sub-domain barrel.
 *
 * Public surface is re-exported via the domain barrel `@/core/khalil`.
 * Sub-domain internals (runtime/, gateway/ implementation files) are
 * never imported from UI.
 */
export { toggleRecoveryFn } from "./gateway/toggleRecovery";
export { readRecoveryStateFn } from "./gateway/readRecoveryState";
export {
  validateRecoveryTransition,
  type RecoveryTransitionVerdict,
  type RecoveryTransitionReason,
} from "./runtime/validateRecoveryTransition";
export {
  resolveRecoveryState,
  isRecoverySoftened,
  type ResolvedRecoveryState,
} from "./runtime/resolveRecoveryState";
export {
  recoveryModeSchema,
  toggleRecoveryInputSchema,
  type RecoveryMode,
  type ToggleRecoveryInput,
  type RecoveryStateDTO,
  type RecoveryEventRow,
} from "./schemas";
