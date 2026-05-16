/**
 * Khalil — Habit event payload contracts (P2.3 / Art. IV).
 *
 * Names live in `@/core/khalil/events` (KHALIL_EVENT). Payloads are
 * single-sourced here so subscribers consume only what producers
 * published — never cross-domain table reads (Anti-pattern 06).
 */
import type { HabitCadence, HabitCompletionMode } from "./schemas";

interface BaseEnvelope {
  id: string;
  version: 1;
  trace_id: string;
  occurred_at: string;
  actor_id: string;
}

export interface KhalilHabitDefinedEnvelope extends BaseEnvelope {
  name: "khalil.habit.defined";
  payload: {
    user_id: string;
    habit_id: string;
    slug: string;
    name_key: string;
    cadence: HabitCadence;
    target_per_day: number;
  };
}

export interface KhalilHabitArchivedEnvelope extends BaseEnvelope {
  name: "khalil.habit.archived";
  payload: {
    user_id: string;
    habit_id: string;
  };
}

export interface KhalilHabitCompletedEnvelope extends BaseEnvelope {
  name: "khalil.habit.completed";
  payload: {
    user_id: string;
    habit_id: string;
    date: string;
    partial: number;
    mode: HabitCompletionMode;
  };
}

export type KhalilHabitEventEnvelope =
  | KhalilHabitDefinedEnvelope
  | KhalilHabitArchivedEnvelope
  | KhalilHabitCompletedEnvelope;
