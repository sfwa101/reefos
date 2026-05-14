/**
 * Vision Cortex Gateway — Layer 3
 * Constitution v2.0 · Article 12.2 (Vision Cortex) · Article 8.1 (Human Veto)
 *
 * Server-side surface routing every visual inference through the
 * `vision_inferences` audit ledger. The heavy AI lifting is currently
 * proxied to the legacy `vision_genesis` edge function — the cortex owns
 * the trace, lifecycle, and Human Veto. No direct writes to
 * `salsabil_assets`; minting still flows through `mint_universal_asset`
 * after explicit admin approval.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { runVisionGenesis } from "../genesis.server";
import type { JsonObject } from "@/core/commerce/knowledge/dna.types";
import type {
  InferenceState,
  VisionInferenceTrace,
} from "../domain/types";

const LEGACY_MODEL = "gemini-pro-vision-legacy";
const LEGACY_PROMPT_VERSION = "v0-legacy";

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const visionInputSchema = z.object({
  image_base64: z.string().min(16, "image_base64 is required"),
  barcode: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const inferenceIdSchema = z.object({
  inference_id: z.string().uuid(),
});

const rejectSchema = z.object({
  inference_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function hashInput(seed: string): string {
  // MVP pseudo-hash — sufficient for dedup lookups; upgrade to SHA-256 later.
  return seed.substring(0, 32);
}

interface VisionInferenceRow {
  id: string;
  input_hash: string;
  model: string;
  prompt_version: string;
  raw_output: unknown;
  draft_payload: unknown;
  state: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

function rowToTrace(row: VisionInferenceRow): VisionInferenceTrace {
  return {
    id: row.id,
    input_hash: row.input_hash,
    model: row.model,
    prompt_version: row.prompt_version,
    raw_output: (row.raw_output ?? {}) as JsonObject,
    draft_payload: (row.draft_payload ?? {}) as JsonObject,
    state: row.state as InferenceState,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────
// inferEntityFn — proxy to legacy edge fn + append ledger row
// ─────────────────────────────────────────────────────────────

export const inferEntityFn = createServerFn({ method: "POST" })
  .inputValidator((input) => visionInputSchema.parse(input))
  .handler(async ({ data }): Promise<VisionInferenceTrace> => {
    const aiRaw = await runVisionGenesis({
      image_base64: data.image_base64,
      hint: typeof data.context?.hint === "string" ? data.context.hint : undefined,
    });
    if (!aiRaw || aiRaw.ok === false) {
      throw new Error(`vision_genesis_failed: ${aiRaw?.details ?? aiRaw?.error ?? "unknown"}`);
    }

    const rawOutput = (aiRaw ?? {}) as unknown as JsonObject;
    // Strip transport noise; whatever the edge fn returns IS the draft.
    const { error: _err, ...draftPayload } = rawOutput as Record<string, unknown>;
    void _err;

    const insertRow = {
      input_hash: hashInput(data.image_base64),
      model: LEGACY_MODEL,
      prompt_version: LEGACY_PROMPT_VERSION,
      raw_output: rawOutput,
      draft_payload: draftPayload as JsonObject,
      state: "pending" as InferenceState,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("vision_inferences")
      .insert(insertRow)
      .select("*")
      .single();

    if (insertError || !inserted) {
      throw new Error(
        `vision_ledger_insert_failed: ${insertError?.message ?? "unknown"}`,
      );
    }

    return rowToTrace(inserted as VisionInferenceRow);
  });

// ─────────────────────────────────────────────────────────────
// approveInferenceFn — Human Veto: mint then mark approved
// ─────────────────────────────────────────────────────────────

export const approveInferenceFn = createServerFn({ method: "POST" })
  .inputValidator((input) => inferenceIdSchema.parse(input))
  .handler(async ({ data }): Promise<VisionInferenceTrace> => {
    const { data: row, error: fetchError } = await supabase
      .from("vision_inferences")
      .select("*")
      .eq("id", data.inference_id)
      .single();

    if (fetchError || !row) {
      throw new Error(
        `inference_not_found: ${fetchError?.message ?? data.inference_id}`,
      );
    }

    const trace = rowToTrace(row as VisionInferenceRow);
    if (trace.state !== "pending") {
      throw new Error(`inference_not_pending: state=${trace.state}`);
    }

    const { data: userRes } = await supabase.auth.getUser();
    const approverId = userRes?.user?.id ?? null;

    // Mint via the existing legacy RPC. Persistence rules unchanged.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: mintError } = await dynamicSb.rpc(
      "mint_universal_asset",
      { payload: trace.draft_payload },
    );
    if (mintError) {
      throw new Error(`mint_failed: ${mintError.message}`);
    }

    const { data: updated, error: updateError } = await supabase
      .from("vision_inferences")
      .update({
        state: "approved",
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", trace.id)
      .eq("state", "pending")
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(
        `inference_update_failed: ${updateError?.message ?? "unknown"}`,
      );
    }

    return rowToTrace(updated as VisionInferenceRow);
  });

// ─────────────────────────────────────────────────────────────
// rejectInferenceFn — Human Veto: discard draft
// ─────────────────────────────────────────────────────────────

export const rejectInferenceFn = createServerFn({ method: "POST" })
  .inputValidator((input) => rejectSchema.parse(input))
  .handler(async ({ data }): Promise<VisionInferenceTrace> => {
    void data.reason; // reserved for future ledger annotation
    const { data: userRes } = await supabase.auth.getUser();
    const approverId = userRes?.user?.id ?? null;

    const { data: updated, error: updateError } = await supabase
      .from("vision_inferences")
      .update({
        state: "rejected",
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.inference_id)
      .eq("state", "pending")
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new Error(
        `inference_reject_failed: ${updateError?.message ?? "not_pending_or_missing"}`,
      );
    }

    return rowToTrace(updated as VisionInferenceRow);
  });
