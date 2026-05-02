import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight reader for `public.app_settings` (key/value JSONB store).
 * Falls back to the provided default when fetch fails so the UI never blocks.
 */
export function useSystemSetting<T>(key: string, fallback: T): {
  value: T;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [value, setValue] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (data && data.value !== null && data.value !== undefined) {
        setValue(data.value as T);
      } else {
        setValue(fallback);
      }
    } catch (e) {
      console.warn("[system-settings] fallback for", key, e);
      setValue(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, loading, refresh };
}

export async function setSystemSetting<T>(key: string, value: T): Promise<boolean> {
  const { error } = await supabase
    .from("app_settings")
    .upsert([{ key, value: value as never }], { onConflict: "key" });
  if (error) {
    console.error("[system-settings] save failed", key, error);
    return false;
  }
  return true;
}
