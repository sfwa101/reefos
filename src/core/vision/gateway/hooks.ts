/**
 * Vision Cortex — Client Hooks (Layer 3 binding)
 * Constitution v2.0 · Article 12.2 · Article 8.1 (Human Veto)
 *
 * Thin React Query bindings around the audited gateway server functions.
 * UI components MUST use these hooks rather than calling the legacy
 * `vision_genesis` edge function or `mint_universal_asset` RPC directly.
 */
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  inferEntityFn,
  approveInferenceFn,
  rejectInferenceFn,
} from "./vision.functions";
import type { VisionInferenceTrace } from "../domain/types";
import type { JsonObject } from "@/core/commerce/knowledge/dna.types";

export interface InferEntityInput {
  readonly image_base64: string;
  readonly barcode?: string;
  readonly context?: JsonObject;
}

export function useInferEntity() {
  const fn = useServerFn(inferEntityFn);
  return useMutation<VisionInferenceTrace, Error, InferEntityInput>({
    mutationFn: async (input) => fn({ data: input }),
  });
}

export function useApproveInference() {
  const fn = useServerFn(approveInferenceFn);
  return useMutation<VisionInferenceTrace, Error, { inference_id: string }>({
    mutationFn: async (input) => fn({ data: input }),
  });
}

export function useRejectInference() {
  const fn = useServerFn(rejectInferenceFn);
  return useMutation<
    VisionInferenceTrace,
    Error,
    { inference_id: string; reason?: string }
  >({
    mutationFn: async (input) => fn({ data: input }),
  });
}
