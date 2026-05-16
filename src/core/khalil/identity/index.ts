/**
 * Khalil — Identity sub-domain barrel (P2.5).
 *
 * Public surface re-exported by `@/core/khalil`. Sub-domain internals
 * (runtime/, gateway/ files) are NEVER imported from UI.
 */
export { readIdentityFn } from "./gateway/readIdentity";
export { recomputeIdentityFn } from "./gateway/recomputeIdentity";
export {
  KHALIL_IDENTITY_LEVELS,
  LEVEL_INDEX,
  LEVEL_THRESHOLDS,
  WINDOW_WEIGHTS,
  RECOVERY_SOFTENING,
  levelByIndex,
  type KhalilIdentityLevel,
  type LevelThreshold,
} from "./runtime/config";
export {
  computeRollingWindows,
  computeIdentityScore,
  resolveIdentityLevel,
  shouldEvolveIdentity,
  computeIdentity,
  type AdherenceDay,
  type RollingWindows,
  type IdentityComputation,
} from "./runtime/engine";
export {
  identityLevelSchema,
  readIdentityInputSchema,
  recomputeIdentityInputSchema,
  type IdentityStateDTO,
  type IdentityEventRow,
  type RollingWindowsDTO,
  type RecomputeIdentityInput,
} from "./schemas";
