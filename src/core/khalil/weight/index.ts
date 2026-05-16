/**
 * Khalil — Weight sub-domain barrel (P2.7).
 */
export { writeWeightMeasurementFn } from "./gateway/writeMeasurement";
export { readWeightTrendFn } from "./gateway/readTrend";
export {
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  type WeightMeasurementRow,
  type WeightTrendDTO,
  type WeightTrendDirection,
  type WriteMeasurementInput,
  type WeightSource,
} from "./schemas";
export { computeWeightTrend } from "./runtime/computeWeightTrend";
