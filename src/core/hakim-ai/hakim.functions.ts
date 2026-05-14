/**
 * Hakim AI — Sovereign Server Functions (Wave P-4.2).
 *
 * Replaces `hakim-pulse`, `hakim-advisor`, `hakim_architect` Supabase edge
 * functions with TanStack `createServerFn` instances guarded by
 * `requireSupabaseAuth`. Heavy logic lives in `hakim.server.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  runHakimPulse,
  runHakimAdvisor,
  runHakimArchitect,
} from "./hakim.server";

const pulseSchema = z.object({
  page: z.string().max(60).optional(),
  tiles: z.array(z.unknown()).max(50).optional(),
});

export const hakimPulseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => pulseSchema.parse(input))
  .handler(async ({ data }) => {
    return runHakimPulse(data);
  });

const advisorSchema = z.object({
  kind: z.string().max(40).optional(),
  days: z.number().int().min(1).max(90).optional(),
  question: z.string().max(1000).optional(),
});

export const hakimAdvisorFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => advisorSchema.parse(input))
  .handler(async ({ data, context }) => {
    return runHakimAdvisor(data, context.supabase);
  });

const architectSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

export const hakimArchitectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => architectSchema.parse(input))
  .handler(async ({ data }) => {
    return runHakimArchitect(data.prompt);
  });
