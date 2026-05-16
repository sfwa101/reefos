/**
 * Khalil — Weight event envelopes (P2.7 / Art. IV).
 */
interface BaseEnvelope {
  id: string;
  version: 1;
  trace_id: string;
  occurred_at: string;
  actor_id: string;
}

export interface KhalilWeightRecordedEnvelope extends BaseEnvelope {
  name: "khalil.weight.recorded";
  payload: {
    user_id: string;
    measurement_id: string;
    for_date: string;
    weight_kg: number;
    source: "manual" | "imported";
  };
}

export type KhalilWeightEventEnvelope = KhalilWeightRecordedEnvelope;
