/**
 * useDriverEngine — single source of truth for the Driver operational surface.
 *
 * Phase 12.1 — Barq Sovereignty rewrite.
 * --------------------------------------
 * The legacy `delivery_tasks` + `orders` + `profiles` join is purged.
 * The driver now consumes the Sovereign Matrix directly:
 *   - rows  → public.salsabil_fulfillment_nodes WHERE driver_id = me
 *   - customer/address → node.delivery_snapshot (jsonb injected at checkout)
 *   - realtime → channel on salsabil_fulfillment_nodes filtered by driver_id
 *
 * FSM transitions UPDATE the node directly (RLS gates this to the assigned
 * driver). Hitting status='delivered' triggers `trigger_auto_settlement()`
 * which atomically writes the vendor's settlement row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DriverGateway } from "@/core/logistics/gateway/DriverGateway";
import { IdentityGateway } from "@/core/identity";
import { toast } from "sonner";
import { isGodMode } from "@/lib/godMode";
import { enqueueOfflineMutation, isLikelyNetworkError } from "@/lib/offlineSyncQueue";
import type {
  DriverEarnings,
  DriverEvent,
  DriverTask,
  GpsFix,
  OrderInfo,
  SurgeZone,
  TaskStatus,
} from "../types/driver.types";

const MOCK_DRIVER_ID = "god-mode-driver";
const MOCK_DRIVER_TASKS: DriverTask[] = [
  {
    id: "mock-task-1",
    order_id: "mock-order-1",
    status: "pending",
    service_type: "express",
    delivery_zone: "JAMASA",
    customer_barcode: null,
    cod_amount: 250,
    commission_amount: 35,
    driver_lat: null,
    driver_lng: null,
  },
  {
    id: "mock-task-2",
    order_id: "mock-order-2",
    status: "out_for_delivery",
    service_type: "standard",
    delivery_zone: "MANSOURA",
    customer_barcode: null,
    cod_amount: 0,
    commission_amount: 22,
    driver_lat: null,
    driver_lng: null,
  },
];
const MOCK_DRIVER_ORDERS: Record<string, OrderInfo> = {
  "mock-order-1": { id: "mock-order-1", total: 250, user_id: "mock-user-1", full_name: "عميل تجريبي ١", phone: "01000000001" },
  "mock-order-2": { id: "mock-order-2", total: 480, user_id: "mock-user-2", full_name: "عميل تجريبي ٢", phone: "01000000002" },
};

/** Status set the driver actively works on (excludes terminal states). */
const ACTIVE_STATUSES: TaskStatus[] = ["pending", "out_for_delivery", "arrived"];

/** Ask the device for a high-accuracy GPS fix; resolves null on denial/timeout. */
const getGPS = (): Promise<GpsFix> =>
  new Promise((res) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

type SnapshotShape = {
  full_name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  address?: string;
  delivery_address?: string;
  zone?: string;
  delivery_zone?: string;
  service_type?: string;
  cod_amount?: number;
  customer_id?: string;
  user_id?: string;
};

/** Map a Sovereign fulfillment node row → DriverTask + OrderInfo. */
function nodeToTaskAndOrder(node: Record<string, unknown>): {
  task: DriverTask;
  order: OrderInfo;
} {
  const snap = (node.delivery_snapshot ?? {}) as SnapshotShape;
  const masterId = (node.master_order_id as string | null) ?? (node.id as string);
  const total = Number(node.total_amount ?? 0);
  const task: DriverTask = {
    id: node.id as string,
    order_id: masterId,
    status: ((node.status as TaskStatus) ?? "pending") as TaskStatus,
    service_type: (snap.service_type ?? "standard") as DriverTask["service_type"],
    delivery_zone: (snap.delivery_zone ?? snap.zone ?? null) as string | null,
    customer_barcode: null,
    cod_amount: Number(snap.cod_amount ?? 0),
    commission_amount: 0,
    driver_lat: null,
    driver_lng: null,
  };
  const order: OrderInfo = {
    id: masterId,
    total,
    user_id: (snap.customer_id ?? snap.user_id ?? "") as string,
    full_name: snap.full_name ?? snap.customer_name ?? null,
    phone: snap.phone ?? snap.customer_phone ?? null,
    address: snap.address ?? snap.delivery_address ?? null,
  };
  return { task, order };
}

export type DriverEngine = {
  driverId: string | null;
  loading: boolean;
  tasks: DriverTask[];
  orders: Record<string, OrderInfo>;
  surgeZones: SurgeZone[];
  earnings: DriverEarnings;
  busyTaskId: string | null;
  fireEvent: (taskId: string, ev: DriverEvent) => Promise<void>;
  completeDelivery: (task: DriverTask) => Promise<void>;
  refresh: () => Promise<void>;
};

export const useDriverEngine = (): DriverEngine => {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DriverTask[]>([]);
  const [orders, setOrders] = useState<Record<string, OrderInfo>>({});
  const [surgeZones, setSurgeZones] = useState<SurgeZone[]>([]);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const deliveredTodayRef = useRef(0);

  /* ─── core load: Sovereign fulfillment nodes for this driver ─── */
  const load = useCallback(async () => {
    if (isGodMode()) {
      setDriverId(MOCK_DRIVER_ID);
      setTasks(MOCK_DRIVER_TASKS);
      setOrders(MOCK_DRIVER_ORDERS);
      setLoading(false);
      return;
    }
    const uid = await IdentityGateway.getCurrentUserId();
    if (!uid) {
      setDriverId(null);
      setLoading(false);
      return;
    }

    const id = await DriverGateway.getDriverIdForUser(uid);
    setDriverId(id);

    if (!id) {
      setTasks([]);
      setOrders({});
      setLoading(false);
      return;
    }

    const list = await DriverGateway.listActiveDriverNodes(
      id,
      ACTIVE_STATUSES as unknown as string[],
    );
    const taskList: DriverTask[] = [];
    const orderMap: Record<string, OrderInfo> = {};
    for (const n of list) {
      const { task, order } = nodeToTaskAndOrder(n);
      taskList.push(task);
      orderMap[task.order_id] = order;
    }
    setTasks(taskList);
    setOrders(orderMap);
    setLoading(false);
  }, []);

  /* ─── surge zones from geo_zones ─── */
  const loadSurge = useCallback(async () => {
    const data = await DriverGateway.listActiveGeoZones();
    setSurgeZones(((data ?? []) as unknown as SurgeZone[]).filter((z) => z.surge_active));
  }, []);

  /* ─── boot + realtime subscriptions on Sovereign Matrix ─── */
  useEffect(() => {
    load();
    loadSurge();

    const nodesChannel = DriverGateway.subscribeDriverNodes(driverId, (payload) => {
      const n = (payload.new ?? {}) as { status?: string };
      const o = (payload.old ?? {}) as { status?: string };
      if (n?.status === "delivered" && o?.status !== "delivered") {
        deliveredTodayRef.current += 1;
      }
      load();
    });

    const zonesCh = DriverGateway.subscribeGeoZones(() => loadSurge());

    return () => {
      nodesChannel.unsubscribe();
      zonesCh.unsubscribe();
    };
  }, [load, loadSurge, driverId]);

  /* ─── FSM actions: direct UPDATE on the Sovereign node (RLS-gated) ─── */
  const fireEvent = useCallback(
    async (nodeId: string, ev: DriverEvent) => {
      setBusyTaskId(nodeId);
      const gps = await getGPS();

      if (ev === "location_ping") {
        // No status change; this is a courtesy ping. Telemetry hook owns the
        // actual driver_positions write — we just re-fetch.
        setBusyTaskId(null);
        toast.success("تحديث الموقع");
        return;
      }

      const nextStatus: TaskStatus =
        ev === "out_for_delivery" ? "out_for_delivery" : "arrived";

      // Optimistic
      setTasks((prev) =>
        prev.map((t) => (t.id === nodeId ? { ...t, status: nextStatus } : t)),
      );

      const patch: {
        status: string;
        picked_up_at?: string;
        pickup_lat?: number;
        pickup_lng?: number;
      } = { status: nextStatus };
      if (ev === "out_for_delivery") {
        patch.picked_up_at = new Date().toISOString();
        if (gps) {
          patch.pickup_lat = gps.lat;
          patch.pickup_lng = gps.lng;
        }
      }

      const { error } = await DriverGateway.updateFulfillmentNode(nodeId, patch);
      setBusyTaskId(null);

      if (error) {
        // Phase 49 — Ground-Sync: queue locally on network failure so
        // the driver keeps moving; the sync manager flushes on resume.
        if (isLikelyNetworkError(error)) {
          await enqueueOfflineMutation({
            op: "table.update",
            table: "salsabil_fulfillment_nodes",
            match: { id: nodeId },
            patch,
          });
          toast.success("تم الحفظ محلياً، ستتم المزامنة عند عودة الاتصال");
          return;
        }
        toast.error(error.message);
        load();
        return;
      }
      toast.success(
        ev === "out_for_delivery"
          ? "تم تسجيل الخروج للتوصيل"
          : "تم تسجيل الوصول",
      );
    },
    [load],
  );

  const completeDelivery = useCallback(
    async (task: DriverTask) => {
      setBusyTaskId(task.id);
      const gps = await getGPS();

      const cod =
        task.cod_amount > 0
          ? window.confirm(`هل حصّلت ${task.cod_amount} ج.م نقداً؟`)
          : true;
      if (!cod && task.cod_amount > 0) {
        setBusyTaskId(null);
        return;
      }

      const patch: {
        status: string;
        delivered_at: string;
        dropoff_lat?: number;
        dropoff_lng?: number;
      } = {
        status: "delivered",
        delivered_at: new Date().toISOString(),
      };
      if (gps) {
        patch.dropoff_lat = gps.lat;
        patch.dropoff_lng = gps.lng;
      }

      const { error } = await DriverGateway.updateFulfillmentNode(task.id, patch);
      setBusyTaskId(null);

      if (error) {
        if (isLikelyNetworkError(error)) {
          await enqueueOfflineMutation({
            op: "table.update",
            table: "salsabil_fulfillment_nodes",
            match: { id: task.id },
            patch,
          });
          toast.success("تم الحفظ محلياً، ستتم المزامنة عند عودة الاتصال");
          return;
        }
        toast.error(error.message);
        return;
      }
      toast.success("تم التسليم! تمت التسوية تلقائياً");
    },
    [],
  );

  /* ─── derived earnings ─── */
  const earnings = useMemo<DriverEarnings>(() => {
    const forecastEgp = tasks.reduce((s, t) => s + (t.commission_amount ?? 0), 0);
    const codInHandEgp = tasks.reduce((s, t) => s + (t.cod_amount ?? 0), 0);
    return {
      deliveredToday: deliveredTodayRef.current,
      activeCount: tasks.length,
      forecastEgp: Math.round(forecastEgp * 100) / 100,
      codInHandEgp: Math.round(codInHandEgp * 100) / 100,
    };
  }, [tasks]);

  return {
    driverId,
    loading,
    tasks,
    orders,
    surgeZones,
    earnings,
    busyTaskId,
    fireEvent,
    completeDelivery,
    refresh: load,
  };
};
