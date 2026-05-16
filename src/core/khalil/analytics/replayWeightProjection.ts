/**
 * Khalil — Weight trend replay (pure, P2.7).
 *
 * Wraps `computeWeightTrend` so the analytics surface has a uniform
 * "replay" naming convention across pillars.
 */
import type { WeightMeasurementRow, WeightTrendDTO } from "../weight/schemas";
import { computeWeightTrend } from "../weight/runtime/computeWeightTrend";

export function replayWeightTrend(
  rowsAsc: ReadonlyArray<WeightMeasurementRow>,
): WeightTrendDTO {
  return computeWeightTrend(rowsAsc);
}
