/**
 * Server function — تحميل سجل القدرات الكامل.
 * يستدعى مرة واحدة عند bootstrap لـ hydrate الـ in-memory registry.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { CapabilityDescriptor } from "./CapabilityRegistry";

export const listCapabilitiesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CapabilityDescriptor[]> => {
    const { data, error } = await supabase
      .from("capability_registry")
      .select("key, category, requires_aux, metadata");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      key: r.key,
      category: r.category ?? "general",
      requiresAux: Boolean(r.requires_aux),
      metadata: (r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata))
        ? (r.metadata as Record<string, unknown>)
        : {},
    }));
  },
);
