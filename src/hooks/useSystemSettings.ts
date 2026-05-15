import { useEffect, useState } from "react";
import { SystemGateway } from "@/core/system/gateway/SystemGateway";
import { Tracer } from "@/core/system/observability/Tracer";

/**
 * Lightweight reader for system app-settings (key/value JSONB store).
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
      const v = await SystemGateway.getSetting<T>(key);
      setValue(v ?? fallback);
    } catch (e) {
      Tracer.warn("hooks", "system_settings_fallback_for", { args: ["[system-settings] fallback for", key, e] });
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
  return SystemGateway.setSetting(key, value);
}
