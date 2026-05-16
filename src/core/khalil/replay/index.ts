/**
 * Khalil — unified replay infrastructure (P2.8).
 *
 * Single barrel surfacing every projection replay job + drift detection.
 * Drift correction must remain replay-based; never patch projection rows
 * in place (Art. IV, anti-pattern 07).
 */
export {
  KHALIL_PROJECTION_REPLAY,
  type KhalilProjectionKey,
  type ReplayDescriptor,
} from "./topology";
export { runReplay, type ReplayRunOptions, type ReplayProgress } from "./runner";
export {
  checksumProjection,
  detectDrift,
  type DriftReport,
} from "./integrity";
