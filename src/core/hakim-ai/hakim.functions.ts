/**
 * Hakim AI — Sovereign Server Functions (Wave P-4.2).
 *
 * Replaces `hakim-pulse`, `hakim-advisor`, `hakim_architect` Supabase edge
 * functions with TanStack `createServerFn` instances. Each handler uses
 * `requireSupabaseAuth` so RLS-scoped reads (e.g. `financial_snapshot`)
 * execute as the caller. Heavy logic lives in `hakim.server.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  runHakimPulse,
  runHakimAdvisor,
  runHakimArchitect,
  type HakimPulseOutput,
  type HakimAdvisorOutput,
  type HakimArchitectOutput,
} from "./hakim.server";

// ─── Pulse ──────────────────────────────────────────────────────────────
const pulseSchema = z.object({
  page: z.string().max(60).optional(),
  tiles: z.array(z.unknown()).max(50).optional(),
});

export const hakimPulseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => pulseSchema.parse(input))
  .handler(async ({ data }): Promise<HakimPulseOutput> => {
    return runHakimPulse(data);
  });

// ─── Advisor ────────────────────────────────────────────────────────────
const advisorSchema = z.object({
  kind: z.string().max(40).optional(),
  days: z.number().int().min(1).max(90).optional(),
  question: z.string().max(1000).optional(),
});

export type HakimAdvisorFnResult =
  | HakimAdvisorOutput
  | { error: string };

export const hakimAdvisorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => advisorSchema.parse(input))
  .handler(async ({ data, context }): Promise<HakimAdvisorFnResult> => {
    return runHakimAdvisor(data, context.supabase);
  });

// ─── Architect ──────────────────────────────────────────────────────────
const architectSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

export type HakimArchitectFnResult =
  | HakimArchitectOutput
  | { error: string; detail?: string };

export const hakimArchitectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => architectSchema.parse(input))
  .handler(async ({ data }): Promise<HakimArchitectFnResult> => {
    return runHakimArchitect(data.prompt);
  });
