/**
 * useSubscriptions — DB-backed hook for the user's recurring baskets.
 * Replaces the legacy localStorage `loadSubs/saveSubs` pair.
 *
 * On first authenticated mount it migrates any legacy
 * `localStorage["reef-subscriptions-v1"]` rows to `public.saved_baskets`,
 * then clears the local key.
 */
import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  migrateLegacySubscriptions,
} from "@/core/orders/subscriptions";
import type { SubscriptionRecord } from "@/core/commerce/policies/bundle-thresholds";

const KEY = (userId: string) => ["saved-baskets", "subscription", userId] as const;

export function useSubscriptions() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  // One-shot legacy migration.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void migrateLegacySubscriptions(userId).then((n) => {
      if (!cancelled && n > 0) qc.invalidateQueries({ queryKey: KEY(userId) });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, qc]);

  const query = useQuery({
    queryKey: userId ? KEY(userId) : ["saved-baskets", "anon"],
    queryFn: () => (userId ? listSubscriptions(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (rec: Omit<SubscriptionRecord, "id" | "createdAt">) => {
      if (!userId) throw new Error("not authenticated");
      return createSubscription(userId, rec);
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEY(userId) });
    },
  });

  const patch = useMutation({
    mutationFn: (rec: SubscriptionRecord) => updateSubscription(rec),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEY(userId) });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KEY(userId) });
    },
  });

  return {
    subs: query.data ?? [],
    isLoading: query.isLoading,
    isAuthed: Boolean(userId),
    createSubscription: create.mutateAsync,
    updateSubscription: patch.mutateAsync,
    deleteSubscription: remove.mutateAsync,
  };
}
