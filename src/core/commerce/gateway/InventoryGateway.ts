/**
 * InventoryGateway — Phase F-1 Living Inventory Persistence
 *
 * Bridges `LivingInventoryBuilder` UI drafts and the
 * `salsabil_inventory_matrix` table. Each draft becomes a row tied to:
 *   • sku_id           — REQUIRED (the asset's base SKU)
 *   • packaging_tier_id — OPTIONAL (resolved through the tier idMap from
 *                         PackagingGateway, or NULL when packaging is off)
 *
 * Strategy:
 *  - Map any draft `packaging_tier_local_id` through `tierIdMap` so no
 *    `tmp-…` id ever reaches the FK column.
 *  - Upsert on the natural key (sku_id, COALESCE(location_code, '')) which
 *    matches the unique index `uq_salsabil_inventory_sku_location`.
 *  - Diff against existing rows for `baseSkuId` and delete removed drafts.
 */
import { supabase } from "@/integrations/supabase/client";
import { dynamicSb } from "@/integrations/supabase/dynamic";

export type InventoryKind = "count" | "capacity" | "time_slots";

export interface InventoryDraft {
  /** Local draft id — `tmp-…` for unsaved rows, real UUID after persist. */
  id: string;
  /** Local id of the packaging tier this row tracks. NULL = base asset. */
  packaging_tier_local_id: string | null;
  location_code: string;
  inventory_type: InventoryKind;
  /** Free-form availability payload — for "count" we store { quantity }. */
  availability_data: Record<string, unknown>;
}

type InventoryRow = {
  id: string;
  sku_id: string;
  packaging_tier_id: string | null;
  location_code: string | null;
  inventory_type: InventoryKind;
  availability_data: Record<string, unknown>;
};

const TABLE = "salsabil_inventory_matrix";

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function isPersistedId(id: string | undefined | null): boolean {
  if (!id) return false;
  return !id.startsWith("tmp-") && !id.startsWith("local_");
}

export const InventoryGateway = {
  /** List inventory rows for a base SKU. */
  async listForSku(skuId: string): Promise<InventoryRow[]> {
    if (!skuId) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await dynamicSb
      .from(TABLE)
      .select("*")
      .eq("sku_id", skuId);
    if (error) throw new Error(error.message);
    return (data ?? []) as InventoryRow[];
  },

  /** Wipe all inventory rows for a base SKU. */
  async wipeInventoryForSku(skuId: string): Promise<void> {
    if (!skuId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await dynamicSb
      .from(TABLE)
      .delete()
      .eq("sku_id", skuId);
    if (error) throw new Error(error.message);
  },

  /**
   * Synchronize inventory rows for `baseSkuId` to match `drafts`.
   *
   * @param baseSkuId   REQUIRED — every row is tied to this SKU.
   * @param drafts      Drafts from LivingInventoryBuilder.
   * @param tierIdMap   Local-id → real-DB-id map from PackagingGateway.
   *                    Optional — empty when packaging is disabled.
   */
  async syncInventory(
    baseSkuId: string,
    drafts: InventoryDraft[],
    tierIdMap?: Map<string, string>,
  ): Promise<void> {
    if (!baseSkuId) {
      throw new Error("InventoryGateway.syncInventory: baseSkuId required");
    }

    // 1. Snapshot existing rows.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchErr } = await dynamicSb
      .from(TABLE)
      .select("id")
      .eq("sku_id", baseSkuId);
    if (fetchErr) throw new Error(fetchErr.message);
    const existingIds = new Set<string>(
      ((existing ?? []) as Array<{ id: string }>).map((r) => r.id),
    );

    // 2. Resolve tier ids and allocate row UUIDs.
    const rows: InventoryRow[] = [];
    for (const d of drafts) {
      let tierId: string | null = null;
      if (d.packaging_tier_local_id) {
        const local = d.packaging_tier_local_id;
        const mapped = tierIdMap?.get(local);
        if (mapped) tierId = mapped;
        else if (isPersistedId(local)) tierId = local;
        else {
          console.warn(
            `[InventoryGateway] dropping row: unresolved tier id "${local}"`,
          );
          continue;
        }
      }
      const reuse = isPersistedId(d.id) && existingIds.has(d.id);
      rows.push({
        id: reuse ? d.id : newUuid(),
        sku_id: baseSkuId,
        packaging_tier_id: tierId,
        location_code: d.location_code?.trim() || null,
        inventory_type: d.inventory_type,
        availability_data: d.availability_data ?? {},
      });
    }

    // 3. Upsert on the natural key (sku_id, location_code).
    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await dynamicSb
        .from(TABLE)
        .upsert(rows, { onConflict: "sku_id,location_code" });
      if (upErr) throw new Error(upErr.message);
    }

    // 4. Delete removed rows.
    const keptIds = new Set(rows.map((r) => r.id));
    const toDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));
    if (toDelete.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delErr } = await dynamicSb
        .from(TABLE)
        .delete()
        .eq("sku_id", baseSkuId)
        .in("id", toDelete);
      if (delErr) throw new Error(delErr.message);
    }
  },
};

export type InventoryGatewayType = typeof InventoryGateway;
