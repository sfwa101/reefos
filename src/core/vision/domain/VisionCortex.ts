/**
 * IVisionCortex — Layer 4 domain interface.
 *
 * Sovereign contract for any vision inference engine. Concrete
 * implementations (legacy edge proxy, native gateway, mocked test double)
 * fulfil this interface so callers depend on the abstraction, not the
 * model backend. Constitution v2.0 · Article 12.2.
 */
import type { VisionInferenceTrace, VisionInput } from "./types";

export interface IVisionCortex {
  /** Run an inference and persist a `pending` audit row. */
  infer(input: VisionInput): Promise<VisionInferenceTrace>;
}
