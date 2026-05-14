import { useEffect, useState } from "react";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";

export type PulseTone = "positive" | "neutral" | "warning" | "critical";
export type PulseTile = { key: string; label: string; value: number | string };
export type PulseInsight = { text: string; tone: PulseTone };
export type PulseInsights = Record<string, PulseInsight>;

const memCache = new Map<string, { at: number; insights: PulseInsights }>();
const HOUR_MS = 60 * 60 * 1000;

function hashTiles(page: string, tiles: PulseTile[]): string {
  return `${page}::${tiles.map((t) => `${t.key}:${t.value}`).join("|")}`;
}

export function useHakimPulse(page: string, tiles: PulseTile[]) {
  const [insights, setInsights] = useState<PulseInsights>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tiles?.length) return;
    const key = hashTiles(page, tiles);
    const cached = memCache.get(key);
    if (cached && Date.now() - cached.at < HOUR_MS) {
      setInsights(cached.insights);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await HakimGateway.invokeHakimPulse({ page, tiles });
        if (cancelled) return;
        if (error || !data?.insights) {
          setInsights({});
        } else {
          memCache.set(key, { at: Date.now(), insights: data.insights });
          setInsights(data.insights);
        }
      } catch {
        if (!cancelled) setInsights({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashTiles(page, tiles)]);

  return { insights, loading };
}
