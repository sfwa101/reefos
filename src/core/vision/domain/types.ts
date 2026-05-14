/**
 * Vision Cortex — Domain Types (Layer 4).
 *
 * Pure, framework-free contracts for the sovereign Vision Cortex. Every
 * AI inference (image / barcode → draft CivilizationEntity) flows through
 * these shapes and is persisted as an append-only `VisionInferenceTrace`
 * row, satisfying Constitution v2.0 Article 12.2 (Vision Cortex) and
 * Article 8.1 (Human Veto).
 */
import type { JsonObject } from "@/core/commerce/knowledge/dna.types";

/** Lifecycle of an inference row. Append-only — state is mutated in place
 * on the tracker only; the inference itself is never deleted. */
export type InferenceState = "pending" | "approved" | "rejected";

/** ISO-8601 timestamp string. */
export type ISODate = string;

/** Input envelope handed to the Cortex. At least one of `image_base64` or
 * `barcode` must be provided; `context` carries optional admin hints. */
export interface VisionInput {
  readonly image_base64?: string;
  readonly barcode?: string;
  readonly context?: JsonObject;
}

/** Append-only audit row. Mirrors `public.vision_inferences`. */
export interface VisionInferenceTrace {
  readonly id: string;
  readonly input_hash: string;
  readonly model: string;
  readonly prompt_version: string;
  readonly raw_output: JsonObject;
  /** Sanitized draft of a `CivilizationEntity` awaiting Human Veto. */
  readonly draft_payload: JsonObject;
  readonly state: InferenceState;
  readonly approved_by: string | null;
  readonly approved_at: ISODate | null;
  readonly created_at: ISODate;
}
