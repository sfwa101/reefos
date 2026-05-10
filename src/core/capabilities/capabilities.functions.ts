/**
 * Server function — تحميل سجل القدرات الكامل من DB.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export interface CapabilityRow {
  key: string;
  domain: string;
  schema: Record<string, unknown>;
}

export const listCapabilitiesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabase
      .from("capability_registry")
      .select("key, domain, schema")
      .eq("is_active", true);
    if (error) throw error;
    const rows: CapabilityRow[] = (data ?? []).map((r) => ({
      key: r.key,
      domain: r.domain ?? "general",
      schema:
        r.schema && typeof r.schema === "object" && !Array.isArray(r.schema)
          ? (r.schema as Record<string, unknown>)
          : {},
    }));
    return rows as unknown as { key: string; domain: string; schema: Record<string, unknown> }[];
  },
);
