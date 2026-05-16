/**
 * Khalil — Home compose gateway (server fn).
 *
 * Only entrypoint UI may call to resolve the Khalil home. Per ADR-0004
 * the descriptor tree is computed server-side. P2.1 returns a minimal
 * scaffold; capability gating + urgency scoring land in P2.2 with the
 * first pillar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RenderDescriptor } from "@/core/runtime-ui";
import {
  composeKhalilHome,
  type KhalilHomeContext,
} from "./composeHome";

function bucketTimeOfDay(d: Date): KhalilHomeContext["timeOfDay"] {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 7) return "fajr";
  if (h < 11) return "morning";
  if (h < 14) return "midday";
  if (h < 17) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

export const composeKhalilHomeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const now = new Date();
    const localDate = now.toISOString().slice(0, 10);

    // P2.1: capability set + recovery state are intentionally empty until
    // their owning sub-domains land. Resolver tolerates this shape.
    const descriptor = composeKhalilHome({
      userId,
      localDate,
      timeOfDay: bucketTimeOfDay(now),
      recovery: "off",
      capabilities: new Set<string>(),
    });

    // Serialize through JSON so TanStack's strict inference resolves to a
    // plain transport shape; the client re-casts to RenderDescriptor.
    return { descriptor: JSON.parse(JSON.stringify(descriptor)) as Record<string, never> };
  });
