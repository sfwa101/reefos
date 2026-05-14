/**
 * usePredictBasket — Phase 5 client adapter for the `predict_basket`
 * Lovable Cloud edge function. Wraps `supabase.functions.invoke` in a
 * TanStack Query so the Hakim Predictive Cart UI gets caching,
 * loading/error states, and easy refetch on demand.
 */
import { useQuery } from "@tanstack/react-query";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";
import { useAuth } from "@/context/AuthContext";

export type PredictedBasketLine = {
  product_id: string;
  quantity: number;
  reason: string;
  name: string;
  unit: string;
  price: number;
  image: string | null;
  category: string;
};

export type PredictedBasket = {
  ok: boolean;
  empty?: boolean;
  headline: string;
  confidence: number;
  basket: PredictedBasketLine[];
  generated_at?: string;
};

export type PredictBasketError =
  | "rate_limited"
  | "credits_exhausted"
  | "ai_error"
  | "unauthorized"
  | "unknown";

async function fetchPrediction(): Promise<PredictedBasket> {
  const { data, error } = await HakimGateway.invokePredictBasket();
  if (error) {
    // Map FunctionsHttpError → typed error code when possible
    const code =
      (data as { error?: PredictBasketError } | null)?.error ?? "unknown";
    throw new Error(code);
  }
  if (!data || (data as { error?: string }).error) {
    throw new Error((data as { error?: string })?.error ?? "unknown");
  }
  return data as PredictedBasket;
}

export function usePredictBasket() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hakim", "predict-basket", user?.id ?? "anon"],
    queryFn: fetchPrediction,
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: (count, err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "rate_limited" || msg === "credits_exhausted") return false;
      return count < 1;
    },
  });
}
