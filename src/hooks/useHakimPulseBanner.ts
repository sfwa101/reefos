// Encapsulates the Hakim pulse-banner fetch behind the sovereign gateway so
// admin components stay free of direct Supabase / edge-function calls.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getHakimPulseBannerFn } from "@/core/hakim-ai/hakim-admin.functions";

export type HakimPulseBannerState = {
  pulse: string;
  loading: boolean;
  error: string | null;
};

const ERROR_LABEL: Record<string, string> = {
  rate_limited: "الطلبات كثيرة، حاول بعد دقيقة.",
  credits_exhausted: "نفد رصيد الذكاء الاصطناعي.",
  failed: "تعذر قراءة النبضة",
};

export function useHakimPulseBanner(
  metrics: Record<string, unknown>,
  page: string = "finance",
): HakimPulseBannerState {
  const [pulse, setPulse] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callPulse = useServerFn(getHakimPulseBannerFn);

  // Stable signature so we don't refetch every render.
  const sig = JSON.stringify(metrics);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const out = await callPulse({ data: { metrics, page } });
        if (cancelled) return;
        if (out?.error) setError(ERROR_LABEL[out.error] ?? ERROR_LABEL.failed);
        else setPulse(out?.pulse ?? "");
      } catch {
        if (!cancelled) setError(ERROR_LABEL.failed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, page]);

  return { pulse, loading, error };
}
