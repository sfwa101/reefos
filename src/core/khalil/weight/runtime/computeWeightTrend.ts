/**
 * Khalil — Weight trend math (pure, P2.7).
 *
 * Used by replay/tests to recompute the projection deterministically
 * from the measurement log. Mirrors the DB trigger logic.
 */
import type { WeightMeasurementRow, WeightTrendDirection, WeightTrendDTO } from "../schemas";

function avgInWindow(
  rows: ReadonlyArray<WeightMeasurementRow>,
  fromIso: string,
): number | null {
  const subset = rows.filter((r) => r.forDate >= fromIso);
  if (subset.length === 0) return null;
  const total = subset.reduce((a, r) => a + r.weightKg, 0);
  return Math.round((total / subset.length) * 100) / 100;
}

function prevBefore(
  rows: ReadonlyArray<WeightMeasurementRow>,
  upToIso: string,
): WeightMeasurementRow | null {
  const subset = rows.filter((r) => r.forDate <= upToIso);
  if (subset.length === 0) return null;
  return subset.reduce((acc, r) => (r.forDate > acc.forDate ? r : acc));
}

function daysAgoIso(refIso: string, days: number): string {
  const t = Date.parse(`${refIso}T00:00:00Z`) - days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

export function computeWeightTrend(
  rowsAsc: ReadonlyArray<WeightMeasurementRow>,
): WeightTrendDTO {
  if (rowsAsc.length === 0) {
    return {
      latestKg: null,
      latestForDate: null,
      avg7d: null,
      avg30d: null,
      avg90d: null,
      delta7d: null,
      delta30d: null,
      delta90d: null,
      trendDirection: "flat",
      measurementsCount: 0,
    };
  }
  const latest = rowsAsc[rowsAsc.length - 1];
  const ref = latest.forDate;
  const w7Iso = daysAgoIso(ref, 7);
  const w30Iso = daysAgoIso(ref, 30);
  const w90Iso = daysAgoIso(ref, 90);
  const avg7 = avgInWindow(rowsAsc, w7Iso);
  const avg30 = avgInWindow(rowsAsc, w30Iso);
  const avg90 = avgInWindow(rowsAsc, w90Iso);
  const prev7 = prevBefore(rowsAsc, w7Iso);
  const prev30 = prevBefore(rowsAsc, w30Iso);
  const prev90 = prevBefore(rowsAsc, w90Iso);
  const delta7 = prev7 ? round2(latest.weightKg - prev7.weightKg) : 0;
  const delta30 = prev30 ? round2(latest.weightKg - prev30.weightKg) : 0;
  const delta90 = prev90 ? round2(latest.weightKg - prev90.weightKg) : 0;
  const trend: WeightTrendDirection =
    delta7 < -0.2 ? "down" : delta7 > 0.2 ? "up" : "flat";
  return {
    latestKg: latest.weightKg,
    latestForDate: latest.forDate,
    avg7d: avg7,
    avg30d: avg30,
    avg90d: avg90,
    delta7d: delta7,
    delta30d: delta30,
    delta90d: delta90,
    trendDirection: trend,
    measurementsCount: rowsAsc.length,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
