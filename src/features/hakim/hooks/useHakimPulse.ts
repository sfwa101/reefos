/**
 * useHakimPulse — anomaly + insight stream for the admin surfaces.
 *
 * Combines three signals:
 *   1. A 60-second poll against the `hakim-pulse` edge function for fresh
 *      insight summaries (rate-limit friendly, server-side cached).
 *   2. A live Supabase Realtime subscription on `hakim_anomalies` so the
 *      anomaly count reflects the truth without waiting for the next poll.
 *   3. An initial load from `hakim_anomalies` to hydrate the list on mount.
 *
 * Returns: `{ anomalies, insights, isLoading }`.
 *
 * NOTE: A separate page-tile insights hook lives at `@/hooks/useHakimPulse`
 *       (different shape, kept untouched). This file is the new
 *       admin-dashboard variant — import path differs to avoid collision.
 */
import { useEffect, useRef, useState } from "react";
import { HakimGateway, type GatewayChannel } from "@/core/hakim-ai/gateway/HakimGateway";

export type HakimAnomalySeverity = "info" | "warning" | "error" | "critical";

export type HakimAnomaly = {
  id: string;
  type: string;
  severity: HakimAnomalySeverity;
  description: string;
  source: string | null;
  occurrences: number;
  resolved: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  created_at: string;
};

export type HakimPulseSnapshot = {
  anomalies_total?: number;
  anomalies_open?: number;
  by_severity?: Record<string, number>;
  active_users_15m?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insights?: Record<string, any>;
};

const POLL_MS = 60_000;
const ANOMALY_LIMIT = 50;

export function useHakimPulse() {
  const [anomalies, setAnomalies] = useState<HakimAnomaly[]>([]);
  const [insights, setInsights] = useState<HakimPulseSnapshot>({});
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const loadAnomalies = async () => {
      const data = await HakimGateway.listAnomalies(ANOMALY_LIMIT);
      if (!mounted.current) return;
      setAnomalies((data ?? []) as HakimAnomaly[]);
    };

    const loadPulse = async () => {
      try {
        const { data, error } = await HakimGateway.invokeHakimPulse({
          page: "admin",
          tiles: [],
        });
        if (!mounted.current) return;
        if (!error && data) setInsights(data as HakimPulseSnapshot);
      } catch {
        /* non-blocking */
      }
    };

    (async () => {
      await Promise.all([loadAnomalies(), loadPulse()]);
      if (mounted.current) setIsLoading(false);
    })();

    const pollTimer = window.setInterval(loadPulse, POLL_MS);

    const channel: GatewayChannel = HakimGateway.subscribeAnomalies(() => {
      loadAnomalies();
    });

    return () => {
      mounted.current = false;
      window.clearInterval(pollTimer);
      channel.unsubscribe();
    };
  }, []);

  const openAnomalies = anomalies.filter((a) => !a.resolved);

  return {
    anomalies,
    openAnomalies,
    insights,
    isLoading,
  };
}
