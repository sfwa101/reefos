/**
 * Khalil — Coach pillar schemas (P2.6).
 *
 * Source of truth for proposal wire-format. UI never crafts these by
 * hand; the gateway returns DTOs that match these schemas exactly.
 *
 * Strict invariants (Art. III + p2.6 §3):
 *   - `.strict()` rejects unknown fields (no prompt-injection passthrough).
 *   - `suggested_capability` is constrained to the known KHALIL_CAP set.
 *   - Free-form copy is forbidden — only `copyKey` + structured payload.
 */
import { z } from "zod";
import { KHALIL_CAP, type KhalilCapabilityKey } from "../capabilities";

export const coachProposalKindSchema = z.enum([
  "gentle-reminder",
  "recovery-suggestion",
  "pillar-rebalance-hint",
  "consistency-guidance",
  "quiet-day",
]);
export type CoachProposalKind = z.infer<typeof coachProposalKindSchema>;

export const coachProposalStatusSchema = z.enum([
  "pending",
  "accepted",
  "dismissed",
  "expired",
]);
export type CoachProposalStatus = z.infer<typeof coachProposalStatusSchema>;

const ACCEPTABLE_CAPS: ReadonlySet<string> = new Set<string>([
  // Accept-flow can only trigger these write capabilities. Read caps
  // and recompute-style intents are intentionally excluded.
  KHALIL_CAP.RECOVERY_TOGGLE_WRITE,
  KHALIL_CAP.HABIT_COMPLETE_WRITE,
  KHALIL_CAP.PRAYER_LOG_WRITE,
]);

export const suggestedCapabilitySchema = z
  .string()
  .refine((v) => ACCEPTABLE_CAPS.has(v), {
    message: "unknown_or_forbidden_capability",
  })
  .transform((v) => v as KhalilCapabilityKey);

/**
 * Structured payload — ONLY i18n keys + small primitive metadata.
 * Free-form text is forbidden so raw model output never reaches the UI.
 */
export const coachProposalPayloadSchema = z
  .object({
    copyKey: z.string().min(3).max(120),
    bodyKey: z.string().min(3).max(120).optional(),
    /** Numeric metadata, e.g. adherence percent shown via i18n template. */
    metrics: z.record(z.string().max(40), z.number().finite()).optional(),
    /**
     * Capability intent the user can accept. If absent, proposal is
     * informational only (e.g. quiet-day, consistency-guidance).
     */
    intent: z
      .object({
        capability: suggestedCapabilitySchema,
        params: z.record(z.string().max(40), z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CoachProposalPayload = z.infer<typeof coachProposalPayloadSchema>;

/** Wire-format used to persist a freshly generated proposal. */
export const coachProposalDraftSchema = z
  .object({
    kind: coachProposalKindSchema,
    copyKey: z.string().min(3).max(120),
    payload: coachProposalPayloadSchema,
    suggestedCapability: suggestedCapabilitySchema.nullish(),
    /** Seconds until expiry. Hard cap: 24h. */
    ttlSeconds: z.number().int().min(60).max(60 * 60 * 24),
    promptVersion: z.string().min(1).max(40),
  })
  .strict();
export type CoachProposalDraft = z.infer<typeof coachProposalDraftSchema>;

/** DTO returned to the client. Never includes raw model output. */
export interface CoachProposalDTO {
  id: string;
  kind: CoachProposalKind;
  status: CoachProposalStatus;
  copyKey: string;
  payload: CoachProposalPayload;
  suggestedCapability: KhalilCapabilityKey | null;
  promptVersion: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  dismissedAt: string | null;
}

export const acceptCoachInputSchema = z
  .object({
    proposalId: z.string().uuid(),
    clientEventId: z.string().min(8).max(128),
  })
  .strict();
export type AcceptCoachInput = z.infer<typeof acceptCoachInputSchema>;

export const dismissCoachInputSchema = z
  .object({
    proposalId: z.string().uuid(),
    clientEventId: z.string().min(8).max(128),
  })
  .strict();
export type DismissCoachInput = z.infer<typeof dismissCoachInputSchema>;
