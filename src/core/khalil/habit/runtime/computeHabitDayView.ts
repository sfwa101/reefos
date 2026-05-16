/**
 * Khalil — Habit day view composer (pure).
 *
 * Given today's active habit definitions + that day's completions,
 * produce a stable, sorted view for the UI. No I/O. Deterministic.
 */
import type {
  HabitCompletionRow,
  HabitDefinitionRow,
  HabitTodayView,
} from "../schemas";

export function computeHabitDayView(
  date: string,
  definitions: HabitDefinitionRow[],
  completions: HabitCompletionRow[],
): HabitTodayView {
  const byHabit: Record<string, HabitCompletionRow | null> = {};
  for (const d of definitions) byHabit[d.id] = null;
  for (const c of completions) {
    if (c.date !== date) continue;
    byHabit[c.habitId] = c;
  }
  const active = definitions
    .filter((d) => d.archivedAt === null || d.archivedAt > `${date}T23:59:59Z`)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { date, definitions: active, completions, byHabit };
}
