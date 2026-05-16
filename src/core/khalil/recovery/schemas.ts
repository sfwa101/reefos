/**
 * Khalil — Recovery pillar schemas (P2.4).
 *
 * Source of truth for all wire-format shapes flowing through the recovery
 * gateway. UI never builds raw payloads — it composes inputs that match
 * these Zod schemas. DTOs returned to the client are stripped of any
 * server-only fields.
 */
import { z } from "zod";

export const recoveryModeSchema = z.enum(["off", "soft", "hard"]);
export type RecoveryMode = z.infer<typeof recoveryModeSchema>;

export const toggleRecoveryInputSchema = z.object({
  toState: recoveryModeSchema,
  reason: z.string().min(3).max(280).optional(),
  clientEventId: z.string().min(8).max(128),
});
export type ToggleRecoveryInput = z.infer<typeof toggleRecoveryInputSchema>;

export interface RecoveryStateDTO {
  currentState: RecoveryMode;
  enteredAt: string;
  updatedAt: string;
}

export interface RecoveryEventRow {
  id: string;
  fromState: RecoveryMode;
  toState: RecoveryMode;
  reason: string | null;
  createdAt: string;
}
