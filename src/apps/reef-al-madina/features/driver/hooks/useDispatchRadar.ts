/**
 * useDispatchRadar — Driver-side Radar for Sovereign Dispatch Offers.
 *
 * Phase 12.3 — Smart Dispatch Acceptance.
 * ---------------------------------------
 * Subscribes to `salsabil_dispatch_offers` filtered by the current driver_id.
 * Surfaces the closest pending non-expired offer and exposes an `acceptOffer`
 * mutation that calls the `accept_dispatch_offer` RPC. On success, the driver
 * task caches and the radar are invalidated so the new fulfillment node
 * appears immediately in the driver surface.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { DriverGateway } from "@/core/logistics/gateway/DriverGateway";
import { IdentityGateway } from "@/core/identity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type DispatchOffer = {
  id: string;
  node_id: string;
  driver_id: string;
  status: "pending" | "accepted" | "missed" | "expired" | string;
  expires_at: string;
  created_at: string;
};

export type UseDispatchRadarResult = {
  driverId: string | null;
  offers: DispatchOffer[];
  activeOffer: DispatchOffer | null;
  loading: boolean;
  dismissedIds: string[];
  dismissOffer: (offerId: string) => void;
  acceptOffer: (offerId: string) => Promise<boolean>;
  accepting: boolean;
};

export function useDispatchRadar(): UseDispatchRadarResult {
  const qc = useQueryClient();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);

  // resolve driver id once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await IdentityGateway.getCurrentUserId();
      if (!uid) return;
      const id = await DriverGateway.getDriverIdForUser(uid);
      if (!cancelled) setDriverId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const offersQuery = useQuery({
    queryKey: ["dispatch-radar", driverId ?? "_anon"],
    enabled: !!driverId,
    refetchInterval: 15_000,
    queryFn: async (): Promise<DispatchOffer[]> => {
      const data = await DriverGateway.listPendingDispatchOffers(driverId!);
      return (data ?? []) as unknown as DispatchOffer[];
    },
  });

  // Realtime subscription on offers for this driver
  useEffect(() => {
    if (!driverId) return;
    const ch = DriverGateway.subscribeDispatchOffers(driverId, () => {
      qc.invalidateQueries({ queryKey: ["dispatch-radar", driverId] });
    });
    return () => {
      ch.unsubscribe();
    };
  }, [driverId, qc]);

  const visibleOffers = useMemo(
    () =>
      (offersQuery.data ?? []).filter(
        (o) =>
          !dismissedIds.includes(o.id) &&
          new Date(o.expires_at).getTime() > Date.now(),
      ),
    [offersQuery.data, dismissedIds],
  );

  const activeOffer = visibleOffers[0] ?? null;

  const dismissOffer = useCallback((offerId: string) => {
    setDismissedIds((prev) => (prev.includes(offerId) ? prev : [...prev, offerId]));
  }, []);

  const acceptOffer = useCallback(
    async (offerId: string): Promise<boolean> => {
      if (!driverId) return false;
      setAccepting(true);
      const { data, error } = await DriverGateway.acceptDispatchOffer(offerId, driverId);
      setAccepting(false);
      if (error) {
        toast.error(error.message);
        return false;
      }
      const ok = data === true;
      if (!ok) {
        toast.error("فات الأوان — تم تخصيص الطلب لمندوب آخر");
        dismissOffer(offerId);
        qc.invalidateQueries({ queryKey: ["dispatch-radar", driverId] });
        return false;
      }
      toast.success("تم قبول الطلب! اتجه للاستلام.");
      qc.invalidateQueries({ queryKey: ["dispatch-radar", driverId] });
      // Driver task caches use a variety of keys; invalidate broadly.
      qc.invalidateQueries({ queryKey: ["driver"] });
      qc.invalidateQueries({ queryKey: ["driver-engine"] });
      qc.invalidateQueries({ queryKey: ["maeen", "active-delivery"] });
      return true;
    },
    [driverId, dismissOffer, qc],
  );

  return {
    driverId,
    offers: visibleOffers,
    activeOffer,
    loading: offersQuery.isLoading,
    dismissedIds,
    dismissOffer,
    acceptOffer,
    accepting,
  };
}
