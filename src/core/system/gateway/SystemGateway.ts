/**
 * SystemGateway — Sovereign boundary for system-wide settings (Wave P-3 §12.3).
 *
 * Constitutional contract (SUPABASE_SOVEREIGNTY §2):
 *   • Only place permitted to read/write `app_settings` from UI-bound code paths.
 *   • Returns typed values; UI never imports the Supabase client for these tables.
 *
 * NOTE: pre-existing `as never` casts are preserved verbatim pending Wave P-7.
 */
import { supabase } from "@/integrations/supabase/client";
import { Tracer } from "@/core/system/observability/Tracer";

export const SystemGateway = {
  async getSetting<T>(key: string): Promise<T | null> {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.value === null || data.value === undefined) return null;
    return data.value as T;
  },

  async setSetting<T>(key: string, value: T): Promise<boolean> {
    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key, value: value as never }], { onConflict: "key" });
    if (error) {
      Tracer.error("system", "system_settings_save_failed", { args: ["[system-settings] save failed", key, error] });
      return false;
    }
    return true;
  },
};

export type SystemGatewayType = typeof SystemGateway;
