/**
 * Khalil — Workout weekly projection replay (pure, P2.7).
 *
 * Deterministic rebuild from a set + session stream — used by tests and
 * by future replay tooling to verify the DB trigger matches.
 */
import type { WorkoutSessionRow, WorkoutSetRow } from "../workout/schemas";
import { effectiveSets } from "../workout/runtime/computeVolume";

export interface ReplayWeekKey {
  isoYear: number;
  isoWeek: number;
}

export interface ReplayWorkoutWeek extends ReplayWeekKey {
  totalVolumeKg: number;
  totalSets: number;
  sessionsCount: number;
}

function isoWeekOf(iso: string): ReplayWeekKey {
  const d = new Date(iso);
  // Thursday in current week determines ISO year
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { isoYear: target.getUTCFullYear(), isoWeek: week };
}

export function replayWorkoutWeekly(
  sessions: ReadonlyArray<WorkoutSessionRow>,
  sets: ReadonlyArray<WorkoutSetRow>,
): ReplayWorkoutWeek[] {
  const byKey = new Map<string, ReplayWorkoutWeek>();
  const sessionWeek = new Map<string, ReplayWeekKey>();
  for (const s of sessions) {
    const wk = isoWeekOf(s.startedAt);
    sessionWeek.set(s.id, wk);
    const k = `${wk.isoYear}-${wk.isoWeek}`;
    const cur = byKey.get(k) ?? {
      ...wk,
      totalVolumeKg: 0,
      totalSets: 0,
      sessionsCount: 0,
    };
    cur.sessionsCount += 1;
    byKey.set(k, cur);
  }
  for (const setRow of effectiveSets(sets)) {
    const wk = sessionWeek.get(setRow.sessionId);
    if (!wk) continue;
    const k = `${wk.isoYear}-${wk.isoWeek}`;
    const cur = byKey.get(k) ?? {
      ...wk,
      totalVolumeKg: 0,
      totalSets: 0,
      sessionsCount: 0,
    };
    cur.totalVolumeKg += setRow.reps * setRow.weightKg;
    cur.totalSets += 1;
    byKey.set(k, cur);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.isoYear - b.isoYear ||
      a.isoWeek - b.isoWeek,
  );
}
