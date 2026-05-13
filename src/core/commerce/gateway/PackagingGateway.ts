/**
 * PackagingGateway — Phase D-3 Persistence Gateway
 *
 * Authoritative bridge between the `PackagingHierarchyBuilder` UI state and
 * the `salsabil_packaging_tiers` table. Encapsulates the topological
 * upsert/delete protocol so callers (USAEditor, future bulk importers) can
 * persist a tier tree atomically without worrying about FK ordering.
 *
 * Strategy:
 *  - Generate stable client-side UUIDs for any tier whose draft id does not
 *    exist in the DB (drafts come in with `tmp-…` ids from the builder).
 *  - Sort drafts by depth (root → leaf) and upsert sequentially so a child
 *    is never written before its parent exists.
 *  - Diff against the live DB row set and DELETE tiers the Admin removed.
 *  - `wipeTiers` is provided for the "packaging toggle disabled" branch.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PackagingTier, PackagingTierDraft } from "@/core/commerce/types/packagingTier";

type TierRow = {
  id: string;
  asset_id: string;
  parent_tier_id: string | null;
  tier_label: string;
  uom_code: string | null;
  conversion_to_parent: number;
  conversion_to_base: number;
  barcode: string | null;
  price_override: number | null;
  is_stock_keeping: boolean;
  is_default_sell: boolean;
  is_default_buy: boolean;
  is_active: boolean;
  sort_order: number;
  attributes: Record<string, unknown>;
};

const TABLE = "salsabil_packaging_tiers";

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (should not be reached in modern browsers/edge runtimes).
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function isPersistedId(id: string | undefined | null): boolean {
  if (!id) return false;
  return !id.startsWith("tmp-");
}

/** Compute depth of a draft in the local tree. Cycle-safe. */
function depthOf(
  draft: PackagingTierDraft,
  byId: Map<string, PackagingTierDraft>,
): number {
  let depth = 0;
  let cursor = draft.parent_tier_id;
  const guard = new Set<string>();
  if (draft.id) guard.add(draft.id);
  while (cursor) {
    if (guard.has(cursor)) break;
    guard.add(cursor);
    const parent = byId.get(cursor);
    if (!parent) break;
    depth += 1;
    cursor = parent.parent_tier_id;
  }
  return depth;
}

export const PackagingGateway = {
  /** Fetch existing tiers for an asset, sorted root → leaf. */
  async listTiers(assetId: string): Promise<PackagingTier[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select("*")
      .eq("asset_id", assetId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PackagingTier[];
  },

  /** Wipe every tier for an asset (used when the Admin disables packaging). */
  async wipeTiers(assetId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from(TABLE)
      .delete()
      .eq("asset_id", assetId);
    if (error) throw new Error(error.message);
  },

  /**
   * Synchronize the canonical tier list for `assetId` to match `drafts`.
   * Performs topological upserts (parent before child) and deletes tiers
   * removed from the UI.
   */
  async syncTiers(
    assetId: string,
    drafts: PackagingTierDraft[],
  ): Promise<void> {
    if (!assetId) throw new Error("PackagingGateway.syncTiers: assetId required");

    // 1. Snapshot current DB rows.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: fetchErr } = await (supabase as any)
      .from(TABLE)
      .select("id")
      .eq("asset_id", assetId);
    if (fetchErr) throw new Error(fetchErr.message);
    const existingIds = new Set<string>(
      ((existing ?? []) as Array<{ id: string }>).map((r) => r.id),
    );

    // 2. Allocate real UUIDs for any new (tmp- / unknown) drafts.
    const idMap = new Map<string, string>();
    for (const d of drafts) {
      const local = d.id ?? `tmp-anon-${idMap.size}`;
      const reuse = isPersistedId(d.id) && existingIds.has(d.id as string);
      idMap.set(local, reuse ? (d.id as string) : newUuid());
    }

    // 3. Topological order — parents before children.
    const byLocalId = new Map(drafts.map((d) => [d.id ?? "", d]));
    const ordered = [...drafts].sort(
      (a, b) => depthOf(a, byLocalId) - depthOf(b, byLocalId),
    );

    // 4. Sequential upserts so FK constraints always pass.
    for (const d of ordered) {
      const localId = d.id ?? "";
      const realId = idMap.get(localId)!;
      const parentLocal = d.parent_tier_id ?? null;
      const realParent = parentLocal ? idMap.get(parentLocal) ?? null : null;

      const row: TierRow = {
        id: realId,
        asset_id: assetId,
        parent_tier_id: realParent,
        tier_label: d.tier_label ?? "",
        uom_code: d.uom_code ?? null,
        conversion_to_parent: Number(d.conversion_to_parent ?? 1) || 1,
        conversion_to_base:
          Number(d.conversion_to_base ?? d.conversion_to_parent ?? 1) || 1,
        barcode: d.barcode ?? null,
        price_override: d.price_override ?? null,
        is_stock_keeping: Boolean(d.is_stock_keeping),
        is_default_sell: Boolean(d.is_default_sell),
        is_default_buy: Boolean(d.is_default_buy),
        is_active: d.is_active ?? true,
        sort_order: Number(d.sort_order ?? 0) || 0,
        attributes: d.attributes ?? {},
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(TABLE)
        .upsert(row, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }

    // 5. Delete tiers the Admin removed from the UI.
    const keptRealIds = new Set(idMap.values());
    const toDelete = Array.from(existingIds).filter((id) => !keptRealIds.has(id));
    if (toDelete.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delErr } = await (supabase as any)
        .from(TABLE)
        .delete()
        .eq("asset_id", assetId)
        .in("id", toDelete);
      if (delErr) throw new Error(delErr.message);
    }
  },
};

export type PackagingGatewayType = typeof PackagingGateway;
