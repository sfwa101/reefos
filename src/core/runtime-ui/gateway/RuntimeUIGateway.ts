/**
 * RuntimeUIGateway — Wave P-3 Sub-Wave 9.
 *
 * Sovereign boundary for the Runtime UI / SDUI / Admin Editor families.
 * Encapsulates all `@/integrations/supabase/client` access for:
 *   - ui_layouts (system editor + storefront runtime)
 *   - sdui_layouts / sdui_layout_versions + realtime invalidation
 *   - entity_definitions / entity_attributes / admin_form_schemas
 *   - admin_navigation
 *   - generic admin RPCs (entity_upsert, schema_rollback, action, circuit_breaker)
 *   - generic table list/record reads for Admin engines
 *   - neighborhood-pulse reads (addresses, salsabil_master_orders)
 *   - map-canvas reads (find_nearest_drivers RPC, delivery_polygons count)
 *   - DEV watchdog installation onto the Supabase singleton
 *
 * Pre-existing `any`/`never` casts on dynamic table/RPC names are preserved
 * verbatim — flagged for Wave P-7 type hardening.
 */
import { supabase } from "@/integrations/supabase/client";
import { installSupabaseUiWatchdog } from "@/core/runtime-ui/watchdog";
import { dynamicSb } from "@/integrations/supabase/dynamic";

export type GatewayChannel = { unsubscribe: () => void };

export interface UiLayoutRow {
  id: string;
  page_key: string;
  section_order: string[];
  section_config: Record<string, Record<string, unknown>> | null;
  section_titles: Record<string, string> | null;
  is_active: boolean;
  status: string;
  version?: number;
  title?: string | null;
}

const UI_LAYOUT_COLS =
  "id,page_key,section_order,section_config,section_titles,is_active,status,version,title";

export const RuntimeUIGateway = {
  // ============= ui_layouts =============

  async getUiLayoutByStatus(pageKey: string, status: string) {
    const { data, error } = await supabase
      .from("ui_layouts")
      .select(UI_LAYOUT_COLS)
      .eq("page_key", pageKey)
      .eq("status", status)
      .maybeSingle();
    return { data: (data ?? null) as UiLayoutRow | null, error };
  },

  async getActiveUiLayout(pageKey: string, status: string) {
    const { data } = await supabase
      .from("ui_layouts")
      .select(UI_LAYOUT_COLS)
      .eq("page_key", pageKey)
      .eq("status", status)
      .eq("is_active", true)
      .maybeSingle();
    return (data ?? null) as UiLayoutRow | null;
  },

  async upsertUiLayout(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("ui_layouts")
      .upsert(payload as never, { onConflict: "page_key,status" })
      .select(UI_LAYOUT_COLS)
      .maybeSingle();
    return { data: (data ?? null) as UiLayoutRow | null, error };
  },

  async deleteUiLayoutDraft(pageKey: string) {
    return supabase
      .from("ui_layouts")
      .delete()
      .eq("page_key", pageKey)
      .eq("status", "draft");
  },

  // ============= SDUI =============

  async getSduiActiveLayout(slug: string): Promise<unknown | null> {
    const { data: layout, error: e1 } = await supabase
      .from("sdui_layouts")
      .select("id, active_version_id")
      .eq("slug", slug)
      .maybeSingle();
    if (e1) throw e1;
    if (!layout?.active_version_id) return null;

    const { data: version, error: e2 } = await supabase
      .from("sdui_layout_versions")
      .select("blocks")
      .eq("id", layout.active_version_id)
      .maybeSingle();
    if (e2) throw e2;
    return (version?.blocks as unknown) ?? null;
  },

  subscribeSduiLayoutUpdates(slug: string, onChange: () => void): GatewayChannel {
    const channel = supabase
      .channel(`sdui-updates-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sdui_layouts",
          filter: `slug=eq.${slug}`,
        },
        () => onChange(),
      )
      .subscribe();
    return {
      unsubscribe: () => {
        void supabase.removeChannel(channel);
      },
    };
  },

  // ============= Admin entity engine =============

  async getEntityDefinition(entityKey: string) {
    const { data: def, error } = await supabase
      .from("entity_definitions")
      .select("*")
      .eq("key", entityKey)
      .maybeSingle();
    return { data: def as Record<string, unknown> | null, error };
  },

  async listEntityAttributes(entityId: string) {
    return supabase
      .from("entity_attributes")
      .select("*")
      .eq("entity_id", entityId)
      .order("sort_order");
  },

  async listActiveFormSchemas(entityId: string) {
    return supabase
      .from("admin_form_schemas")
      .select("*")
      .eq("entity_id", entityId)
      .eq("active", true);
  },

  async getEntityRecord(
    tableName: string,
    primaryKeyCol: string,
    id: string,
  ) {
    const { data, error } = await dynamicSb
      .from(tableName)
      .select("*")
      .eq(primaryKeyCol, id)
      .maybeSingle();
    return { data: (data ?? null) as Record<string, unknown> | null, error };
  },

  async listEntityRows(
    tableName: string,
    opts: {
      from: number;
      to: number;
      withCount: boolean;
      eq?: Record<string, string | number | boolean>;
      orderBy?: { column: string; ascending?: boolean };
    },
  ) {
    const selectOpts = opts.withCount ? { count: "exact" as const } : undefined;
    let q = dynamicSb
      .from(tableName)
      .select("*", selectOpts)
      .range(opts.from, opts.to);
    if (opts.eq) {
      for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
    }
    if (opts.orderBy) {
      q = q.order(opts.orderBy.column, {
        ascending: opts.orderBy.ascending ?? true,
      });
    }
    const result = (await q) as { data: unknown; error: unknown; count?: number | null };
    return {
      data: (result.data ?? []) as Record<string, unknown>[],
      count: (result.count as number | null | undefined) ?? null,
      error: result.error,
    };
  },

  async entityUpsert(input: {
    entity_key: string;
    record_id: string | null;
    payload: Record<string, unknown>;
    idempotency_key?: string;
  }) {
    const { data, error } = await dynamicSb.rpc("admin_entity_upsert", {
      p_entity_key: input.entity_key,
      p_record_id: input.record_id,
      p_payload: input.payload,
      p_idempotency_key: input.idempotency_key,
    });
    return { data: data as Record<string, unknown> | null, error };
  },

  async schemaRollback(entityId: string, mode: string) {
    const { data, error } = await supabase.rpc("admin_schema_rollback", {
      p_entity_id: entityId,
      p_mode: mode,
    });
    return { data: data as { rolled_back_to: string; version: number } | null, error };
  },

  async invokeAdminAction(rpcName: string, args: Record<string, unknown>) {
    const { data, error } = await dynamicSb.rpc(rpcName, args);
    return { data, error };
  },

  async listAdminNavigation() {
    return supabase
      .from("admin_navigation")
      .select("*")
      .eq("is_visible", true)
      .order("sort_order");
  },

  // ============= Watchdog (circuit breaker) =============

  async tripCircuitBreaker(settingKey: string, reason: string) {
    const { error } = await dynamicSb.rpc("admin_trigger_circuit_breaker", {
      p_setting_key: settingKey,
      p_reason: reason,
    });
    return { error };
  },

  /** DEV-only Article 3 tripwire installer. Sanctioned injection point. */
  installDevWatchdog(): void {
    installSupabaseUiWatchdog(supabase);
  },

  // ============= Neighborhood Pulse (SDUI block) =============

  async getDefaultAddressCity(userId: string): Promise<string | null> {
    const { data } = await supabase
      .from("addresses")
      .select("city")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    const city = (data?.city as string | undefined)?.trim() || null;
    return city;
  },

  async countNeighborMasterOrders(input: {
    excludeUserId: string;
    sinceIso: string;
    city: string;
  }): Promise<number> {
    const { count } = await supabase
      .from("salsabil_master_orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", input.sinceIso)
      .neq("customer_id", input.excludeUserId)
      .filter("delivery_info->>city", "eq", input.city);
    return count ?? 0;
  },

  // ============= Map Canvas =============

  async findNearestDrivers(input: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
  }) {
    const { data } = await supabase.rpc("find_nearest_drivers", {
      p_lat: input.lat,
      p_lng: input.lng,
      p_radius_m: input.radiusM,
      p_limit: input.limit,
    });
    return (data ?? []) as Array<{ driver_id: string }>;
  },

  async countDeliveryPolygons(): Promise<number> {
    const { count } = await supabase
      .from("delivery_polygons")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  },
};
