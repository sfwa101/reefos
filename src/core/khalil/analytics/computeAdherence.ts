/**
 * Khalil — Adherence aggregation (pure, deterministic).
 *
 * Single source of truth for adherence math, mirrored in SQL by
 * `khalil_recompute_adherence`. Tests in `__tests__/` lock the math.
 *
 * NO client-side persistence. UI calls these for display only when the
 * server-truth projection isn't available (e.g. optimistic UI). The
 * projection in `khalil_adherence_daily` is always authoritative.
 */
import type { PrayerLogRow } from "../prayer/schemas";
import type {
  HabitCompletionRow,
  HabitDefinitionRow,
} from "../habit/schemas";

export interface PrayerAdherenceInput {
  rows: PrayerLogRow[];
}

export interface HabitAdherenceInput {
  date: string;
  definitions: HabitDefinitionRow[];
  completions: HabitCompletionRow[];
}

/** Returns [0..1]. on_time = full credit; qadaa = half; cap at 5 prayers. */
export function computePrayerAdherence(input: PrayerAdherenceInput): number {
  let onTime = 0;
  let qadaa = 0;
  const seen = new Set<string>();
  for (const r of input.rows) {
    const key = `${r.prayer}:${r.mode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.mode === "on_time") onTime += 1;
    else if (r.mode === "qadaa") qadaa += 1;
  }
  const raw = (onTime + qadaa * 0.5) / 5;
  return clamp01(round3(raw));
}

/** Returns [0..1] — sum(partial) / sum(target_per_day) over active habits. */
export function computeHabitAdherence(input: HabitAdherenceInput): number {
  const active = input.definitions.filter((d) => {
    if (d.createdAt.slice(0, 10) > input.date) return false;
    if (d.archivedAt && d.archivedAt.slice(0, 10) <= input.date) return false;
    return true;
  });
  const target = active.reduce((s, d) => s + d.targetPerDay, 0);
  if (target === 0) return 0;
  const done = input.completions
    .filter((c) => c.date === input.date)
    .reduce((s, c) => s + Math.min(c.partial, 1), 0);
  return clamp01(round3(done / target));
}

/** Average pillars that have content; falls back to prayer when no habits defined. */
export function computeCombinedAdherence(params: {
  prayerScore: number;
  habitScore: number;
  hasActiveHabits: boolean;
}): number {
  if (!params.hasActiveHabits) return clamp01(round3(params.prayerScore));
  return clamp01(round3((params.prayerScore + params.habitScore) / 2));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
