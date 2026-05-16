/**
 * Khalil — Workout event envelopes (P2.7 / Art. IV).
 *
 * Names live in `@/core/khalil/events`. Payloads are single-sourced
 * here so subscribers consume only what producers publish.
 */
interface BaseEnvelope {
  id: string;
  version: 1;
  trace_id: string;
  occurred_at: string;
  actor_id: string;
}

export interface KhalilWorkoutSessionOpenedEnvelope extends BaseEnvelope {
  name: "khalil.workout.session_opened";
  payload: {
    user_id: string;
    session_id: string;
    focus: string | null;
  };
}

export interface KhalilWorkoutSessionClosedEnvelope extends BaseEnvelope {
  name: "khalil.workout.session_closed";
  payload: {
    user_id: string;
    session_id: string;
    auto_closed: boolean;
  };
}

export interface KhalilWorkoutSetRecordedEnvelope extends BaseEnvelope {
  name: "khalil.workout.set_recorded";
  payload: {
    user_id: string;
    session_id: string;
    set_id: string;
    exercise_slug: string;
    reps: number;
    weight_kg: number;
    is_correction: boolean;
  };
}

export type KhalilWorkoutEventEnvelope =
  | KhalilWorkoutSessionOpenedEnvelope
  | KhalilWorkoutSessionClosedEnvelope
  | KhalilWorkoutSetRecordedEnvelope;
