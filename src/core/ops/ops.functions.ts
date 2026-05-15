// Ops Gateway — Wave P-D · Phase D-8.
// Aggregates the Business-Ops Dashboard data behind `requireAdmin`.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export type OpsKpiSnapshot = {
  revenue: number;
  count: number;
  aov: number;
  active: number;
};

export type OpsCriticalOrder = {
  id: string;
  customer_id: string | null;
  total_amount: number | null;
  status: string;
  delivery_info: { [x: string]: {} } | null;
  created_at: string;
};

export type OpsLowStockItem = {
  id: string;
  sku_id: string;
  location_code: string | null;
  count: number;
  updated_at: string;
  name: string | null;
};

export type OpsKpis = {
  kpi: OpsKpiSnapshot;
  critical: OpsCriticalOrder[];
  lowStock: OpsLowStockItem[];
};

const ACTIVE_STATUSES = ["pending", "preparing", "out_for_delivery"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

function todayBoundsIso(): { startIso: string; endIso: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export const getOpsKpisFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<OpsKpis> => {
    const sb = context.supabase as SbAny;
    const { startIso, endIso } = todayBoundsIso();

    const [kpiRes, criticalRes, invRes] = await Promise.all([
      sb
        .from("salsabil_master_orders")
        .select("total_amount, status")
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .neq("status", "cancelled")
        .limit(5000),
      sb
        .from("salsabil_master_orders")
        .select("id, customer_id, total_amount, status, delivery_info, created_at")
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(50),
      sb
        .from("salsabil_inventory_matrix")
        .select("id, sku_id, location_code, availability_data, updated_at")
        .eq("inventory_type", "count")
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);

    if (kpiRes.error) throw new Error(kpiRes.error.message);
    if (criticalRes.error) throw new Error(criticalRes.error.message);
    if (invRes.error) throw new Error(invRes.error.message);

    const kpiRows = (kpiRes.data ?? []) as Array<{ total_amount: number | null; status: string }>;
    const revenue = kpiRows.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const count = kpiRows.length;
    const aov = count ? revenue / count : 0;
    const active = kpiRows.filter((r) => (ACTIVE_STATUSES as readonly string[]).includes(r.status)).length;

    const critical = (criticalRes.data ?? []) as OpsCriticalOrder[];

    type InvRow = {
      id: string;
      sku_id: string;
      location_code: string | null;
      availability_data: Record<string, SbAny> | null;
      updated_at: string;
    };
    const invRows = (invRes.data ?? []) as InvRow[];
    const lowRaw = invRows
      .map((r) => {
        const raw = r.availability_data?.["count"];
        const cnt = typeof raw === "number" ? raw : Number(raw ?? NaN);
        return { ...r, count: cnt };
      })
      .filter((r) => Number.isFinite(r.count) && r.count <= 10)
      .slice(0, 25);

    let lowStock: OpsLowStockItem[] = [];
    if (lowRaw.length) {
      const skuIds = Array.from(new Set(lowRaw.map((r) => r.sku_id)));
      const { data: skus } = await sb
        .from("salsabil_skus")
        .select("id, sku_code, asset_id")
        .in("id", skuIds);
      const skuList = (skus ?? []) as Array<{ id: string; sku_code: string | null; asset_id: string | null }>;
      const assetIds = Array.from(
        new Set(skuList.map((s) => s.asset_id).filter((id): id is string => !!id)),
      );
      const assetsRes = assetIds.length
        ? await sb.from("salsabil_assets").select("id, name").in("id", assetIds)
        : { data: [] as Array<{ id: string; name: string | null }> };
      const assets = (assetsRes.data ?? []) as Array<{ id: string; name: string | null }>;
      const assetMap = new Map(assets.map((a) => [a.id, a.name]));
      const skuMap = new Map(
        skuList.map((s) => [
          s.id,
          { sku_code: s.sku_code, name: s.asset_id ? assetMap.get(s.asset_id) ?? null : null },
        ]),
      );
      lowStock = lowRaw.map((r) => {
        const meta = skuMap.get(r.sku_id);
        return {
          id: r.id,
          sku_id: r.sku_id,
          location_code: r.location_code,
          count: r.count,
          updated_at: r.updated_at,
          name: meta?.name ?? meta?.sku_code ?? r.sku_id.slice(0, 8),
        };
      });
    }

    return { kpi: { revenue, count, aov, active }, critical, lowStock };
  });

// ---- Wave R-1 Batch 1 additions ------------------------------------------
export type LowStockItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
};

export const listLowStockProductsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { threshold: number }) => {
    const n = Number(d?.threshold);
    if (!Number.isFinite(n) || n < 1 || n > 100) throw new Error("invalid_threshold");
    return { threshold: Math.floor(n) };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<LowStockItem[]> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb.rpc("low_stock_products", { _threshold: data.threshold });
    if (error) throw new Error(error.message);
    return (rows ?? []) as LowStockItem[];
  });

export type DeliverySettings = {
  id: string;
  require_barcode_default: boolean;
  disable_barcode_for_express: boolean;
  disable_barcode_zones: string[];
  gps_proof_required_when_disabled: boolean;
};

export const getDeliverySettingsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<DeliverySettings | null> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("delivery_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as DeliverySettings | null) ?? null;
  });

export const updateDeliverySettingsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Partial<Omit<DeliverySettings, "id">> }) => {
    if (!d?.id) throw new Error("id_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("delivery_settings")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= Wave R-1 Batch 2 — Orders, Allocation, Inventory =============

export type MasterOrderListRow = {
  id: string;
  total_amount: number | null;
  customer_id: string;
  created_at: string;
  status: string | null;
  node_statuses: string[];
  customer_name: string | null;
  customer_phone: string | null;
};

export const listMasterOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<MasterOrderListRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("salsabil_master_orders")
      .select(`
        id, total_amount, customer_id, created_at, status,
        salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk ( status )
      `)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SbAny[];
    const customerIds = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean)));
    const profileMap = new Map<string, { full_name: string | null; phone: string | null }>();
    if (customerIds.length) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", customerIds);
      (profiles ?? []).forEach((p: SbAny) =>
        profileMap.set(p.id, { full_name: p.full_name ?? null, phone: p.phone ?? null }),
      );
    }
    return rows.map((m) => {
      const nodes: SbAny[] = m.salsabil_fulfillment_nodes ?? [];
      const prof = profileMap.get(m.customer_id);
      return {
        id: m.id,
        total_amount: m.total_amount,
        customer_id: m.customer_id,
        created_at: m.created_at,
        status: m.status ?? null,
        node_statuses: nodes.map((n) => n.status),
        customer_name: prof?.full_name ?? null,
        customer_phone: prof?.phone ?? null,
      };
    });
  });

export const setOrderStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; status: string }) => {
    if (!d?.orderId) throw new Error("orderId_required");
    if (!d?.status) throw new Error("status_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb.rpc("admin_set_order_status", {
      p_order_id: data.orderId,
      p_status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type MasterOrderDetail = {
  id: string;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  customer_id: string;
  delivery_info: Record<string, SbAny> | null;
  node_ids: string[];
  node_statuses: string[];
  node_notes: string[];
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    /** Pre-computed canonical line total (price × quantity) — see Wave P-1.4. */
    total: number;
    product_name: string;
    product_image: string | null;
  }>;
  customer: { full_name: string | null; phone: string | null } | null;
};

export const getMasterOrderDetailFn = createServerFn({ method: "GET" })
  .inputValidator((d: { orderId: string }) => {
    if (!d?.orderId) throw new Error("orderId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<MasterOrderDetail | null> => {
    const sb = context.supabase as SbAny;
    const { data: master, error } = await sb
      .from("salsabil_master_orders")
      .select(`
        id, total_amount, status, created_at, customer_id, delivery_info,
        salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk (
          id, status, notes,
          salsabil_fulfillment_items (
            id, quantity, price_at_time,
            salsabil_skus ( salsabil_assets ( name, media ) )
          )
        )
      `)
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!master) return null;
    const m = master as SbAny;
    const nodes: SbAny[] = m.salsabil_fulfillment_nodes ?? [];
    const items: MasterOrderDetail["items"] = [];
    nodes.forEach((n) => {
      (n.salsabil_fulfillment_items ?? []).forEach((it: SbAny) => {
        const media = it?.salsabil_skus?.salsabil_assets?.media ?? {};
        const image = Array.isArray(media) ? (media[0]?.url ?? null) : (media?.url ?? null);
        const price = Number(it.price_at_time ?? 0);
        const quantity = it.quantity;
        items.push({
          id: it.id,
          quantity,
          price,
          total: historicalLineTotal({ price, quantity }),
          product_name: it?.salsabil_skus?.salsabil_assets?.name ?? "منتج",
          product_image: image,
        });
      });
    });
    let customer: MasterOrderDetail["customer"] = null;
    if (m.customer_id) {
      const { data: cust } = await sb
        .from("profiles")
        .select("full_name,phone")
        .eq("id", m.customer_id)
        .maybeSingle();
      customer = (cust as MasterOrderDetail["customer"]) ?? null;
    }
    return {
      id: m.id,
      total_amount: m.total_amount,
      status: m.status ?? null,
      created_at: m.created_at,
      customer_id: m.customer_id,
      delivery_info: (m.delivery_info as Record<string, SbAny>) ?? null,
      node_ids: nodes.map((n) => n.id),
      node_statuses: nodes.map((n) => n.status),
      node_notes: nodes.map((n) => n.notes).filter(Boolean) as string[],
      items,
      customer,
    };
  });

export type AdminDriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export const listActiveDriversFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<AdminDriverRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("drivers")
      .select("id,full_name,phone")
      .eq("is_active", true)
      .order("full_name")
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminDriverRow[];
  });

export const assignDriverToOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: { nodeIds: string[]; driverId: string }) => {
    if (!Array.isArray(d?.nodeIds) || d.nodeIds.length === 0) throw new Error("nodeIds_required");
    if (!d?.driverId) throw new Error("driverId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { error } = await sb
      .from("salsabil_fulfillment_nodes")
      .update({
        driver_id: data.driverId,
        status: "out_for_delivery",
        assigned_at: new Date().toISOString(),
      })
      .in("id", data.nodeIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type UnassignedNodeRow = {
  id: string;
  master_order_id: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  vendor_id: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
};

export const listUnassignedNodesFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<UnassignedNodeRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("salsabil_fulfillment_nodes")
      .select("id,master_order_id,status,total_amount,created_at,vendor_id,pickup_lat,pickup_lng")
      .is("driver_id", null)
      .in("status", ["pending", "confirmed", "preparing", "ready_for_pickup", "requires_admin_routing"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as UnassignedNodeRow[];
  });

export const broadcastSmartDispatchFn = createServerFn({ method: "POST" })
  .inputValidator((d: { nodeId: string }) => {
    if (!d?.nodeId) throw new Error("nodeId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<{ count: number }> => {
    const sb = context.supabase as SbAny;
    const { data: count, error } = await sb.rpc("broadcast_smart_dispatch", {
      p_node_id: data.nodeId,
    });
    if (error) throw new Error(error.message);
    return { count: Number(count ?? 0) };
  });

export type RecentMasterOrderRow = {
  id: string;
  total_amount: number | null;
  status: string;
  created_at: string;
  customer_id: string;
  sub_count: number;
};

export const listRecentMasterOrdersWithSubCountFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<RecentMasterOrderRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("salsabil_master_orders")
      .select(
        "id,total_amount,status,created_at,customer_id, salsabil_fulfillment_nodes!salsabil_fulfillment_nodes_master_fk(id)",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as SbAny[]).map((m) => ({
      id: m.id,
      total_amount: m.total_amount,
      status: m.status,
      created_at: m.created_at,
      customer_id: m.customer_id,
      sub_count: (m.salsabil_fulfillment_nodes ?? []).length,
    }));
  });

export type AllocationOverviewRow = {
  sub_order_id: string;
  status: string;
  total: number;
  notes: string | null;
  items: Array<{ product_name: string; quantity: number; price: number }> | null;
};

export const getAllocationOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((d: { orderId: string }) => {
    if (!d?.orderId) throw new Error("orderId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<AllocationOverviewRow[]> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb.rpc("allocation_overview", { _order_id: data.orderId });
    if (error) throw new Error(error.message);
    return (rows ?? []) as AllocationOverviewRow[];
  });

export const allocateOrderInventoryFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; zone: string }) => {
    if (!d?.orderId) throw new Error("orderId_required");
    return { orderId: d.orderId, zone: (d.zone || "M").toUpperCase() };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { data: result, error } = await sb.rpc("allocate_order_inventory", {
      _order_id: data.orderId,
      _zone: data.zone,
    });
    if (error) throw new Error(error.message);
    return (result ?? {}) as { allocated_items?: number; failed_items?: SbAny[] };
  });

export const getNestedStockBreakdownFn = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => {
    if (!d?.productId) throw new Error("productId_required");
    return d;
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as SbAny;
    const { data: bd, error } = await sb.rpc("nested_stock_breakdown", {
      _product_id: data.productId,
    });
    if (error) throw new Error(error.message);
    return (bd ?? null) as { human_readable?: string; total_pieces?: number; breakdown?: SbAny[] } | null;
  });
