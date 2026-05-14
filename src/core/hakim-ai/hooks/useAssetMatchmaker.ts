/**
 * useAssetMatchmaker — Phase 8 Part 3.
 * Sovereign Matchmaker: pre-flight semantic dedup check for new USAs.
 * Pipeline: text → generate_embedding edge fn → match_universal_asset RPC.
 */
import { useCallback, useState } from "react";
import { HakimGateway } from "@/core/hakim-ai/gateway/HakimGateway";

export interface MatchedAsset {
  id: string;
  name: string;
  similarity: number;
}

export interface MatchmakerResult {
  matches: MatchedAsset[];
  embedding: number[] | null;
}

export function useAssetMatchmaker() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDuplicates = useCallback(
    async (
      name: string,
      description?: string | null,
      threshold = 0.85,
    ): Promise<MatchmakerResult> => {
      setIsChecking(true);
      setError(null);
      try {
        const text = [name, description ?? ""].filter(Boolean).join(" — ").trim();
        if (!text) return { matches: [], embedding: null };

        const { data: embedRes, error: embedErr } =
          await HakimGateway.invokeGenerateEmbedding(text);
        if (embedErr) throw new Error(embedErr.message ?? "embedding_failed");
        const embedding: number[] | undefined = embedRes?.embedding;
        if (!embedding) throw new Error("no_embedding_returned");

        const { data, error: rpcErr } = await HakimGateway.matchUniversalAsset(
          embedding,
          threshold,
        );
        if (rpcErr) throw new Error(rpcErr.message ?? "match_rpc_failed");

        return {
          matches: (data ?? []) as MatchedAsset[],
          embedding,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown_error";
        setError(msg);
        return { matches: [], embedding: null };
      } finally {
        setIsChecking(false);
      }
    },
    [],
  );

  return { checkDuplicates, isChecking, error };
}
