/**
 * PricingGateway — Phase E-2 Cognitive Pricing Persistence
 *
 * Bridges the `CognitivePricingBuilder` UI state and
 * `salsabil_financial_contracts`. Each draft contract becomes a row tied to:
 *   • sku_id           — REQUIRED (the asset's base SKU)
 *   • packaging_tier_id — OPTIONAL (a freshly-persisted tier UUID, or NULL
 *                         when packaging is disabled / "base asset" card)
 *
 * Strategy:
 *  - Allocate real UUIDs for any draft whose id is missing or `tmp-…`.
 *  - Map each draft's `packaging_tier_local_id` through the tier idMap
 *    returned by PackagingGateway.syncTiers — guarantees no `tmp-…` id is
 *    ever inserted into a foreign-key column.
 *  - Upsert all contracts; diff against existing rows for `sku_id` and
 *    delete contracts removed in the UI.
 *  - `wipeForSku` is provided for the "no contracts" branch (e.g. asset
 *    deleted, or all contracts removed by Admin).
 *
 * NOTE: ZERO awareness of UI components — this is a pure data gateway.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  FinancialContractDraft,
  ContractRules,
  PricingPolicyRule,
  PolicyConditionKey,
  PolicyOperator,
  PolicyActionKey,
} from "@/core/commerce/types/financialContract";
import { Tracer } from "@/core/system/observability/Tracer";

const TABLE = "salsabil_financial_contracts";

type ContractRow = {
  id: string;
  sku_id: string;
  packaging_tier_id: string | null;
  pricing_model: string;
  base_price: number;
  currency: string;
  contract_rules: ContractRules;
  is_active: boolean;
};

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

/* =================================================================
 * Policy validation — guarantees `contract_rules` JSONB is well-formed
 * before it ever hits the DB. Strips unknown keys, coerces numbers,
 * drops malformed policies silently rather than crashing the save.
 * ================================================================= */

const VALID_CONDITIONS: ReadonlySet<PolicyConditionKey> = new Set([
  "customer_group",
  "cart_quantity",
  "season",
  "channel",
  "loyalty_tier",
]);
const VALID_OPS: ReadonlySet<PolicyOperator> = new Set(["eq", "gte", "lte", "in"]);
const VALID_ACTIONS: ReadonlySet<PolicyActionKey> = new Set([
  "discount_percent",
  "discount_amount",
  "surcharge_percent",
  "surcharge_amount",
]);

function sanitizePolicy(p: PricingPolicyRule): PricingPolicyRule | null {
  if (!p || typeof p !== "object") return null;
  const condKey = p.condition?.key as PolicyConditionKey;
  const op = p.condition?.op as PolicyOperator;
  const actKey = p.action?.key as PolicyActionKey;
  if (!VALID_CONDITIONS.has(condKey)) return null;
  if (!VALID_OPS.has(op)) return null;
  if (!VALID_ACTIONS.has(actKey)) return null;
  const value =
    typeof p.condition.value === "number"
      ? p.condition.value
      : String(p.condition.value ?? "");
  const actVal = Number(p.action?.value);
  if (!Number.isFinite(actVal)) return null;
  return {
    id: p.id ?? newUuid(),
    label: p.label,
    condition: { key: condKey, op, value },
    action: { key: actKey, value: actVal },
    is_active: p.is_active !== false,
  };
}

function sanitizeRules(rules: ContractRules | undefined | null): ContractRules {
  const policies = Array.isArray(rules?.policies)
    ? rules!.policies.map(sanitizePolicy).filter((p): p is PricingPolicyRule => p !== null)
    : [];
  return { ...(rules ?? {}), policies };
}

export const PricingGateway = {
  /** Fetch all contracts for a SKU. */
  async listForSku(skuId: string): Promise<ContractRow[]> {
    if (!skuId) return [];
    
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("sku_id", skuId);
    if (error) throw new Error(error.message);
    return (data ?? []) as ContractRow[];
  },

  /** Resolve the asset's base SKU (lowest sort_order, active). */
  async resolveBaseSku(assetId: string): Promise<string | null> {
    if (!assetId) return null;
    
    const { data, error } = await supabase
      .from("salsabil_skus")
      .select("id")
      .eq("asset_id", assetId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = (data ?? [])[0] as { id: string } | undefined;
    return row?.id ?? null;
  },

  /** Wipe all contracts for a SKU (asset toggle off, or full clear). */
  async wipeForSku(skuId: string): Promise<void> {
    if (!skuId) return;
    
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("sku_id", skuId);
    if (error) throw new Error(error.message);
  },

  /**
   * Synchronize the financial contracts for `baseSkuId` to match `drafts`.
   *
   * @param baseSkuId       REQUIRED — every contract is tied to this SKU.
   * @param drafts          UI drafts from CognitivePricingBuilder.
   * @param tierIdMap       Local-id → real-DB-id map from PackagingGateway.
   *                        May be empty if packaging is disabled.
   *
   * Transactional invariant: a draft whose `packaging_tier_local_id` cannot
   * be resolved to a real DB id is dropped (logged) rather than persisted
   * with a garbage FK. The "base" card (`packaging_tier_local_id === null`)
   * always passes through with `packaging_tier_id = null`.
   */
  async syncContracts(
    baseSkuId: string,
    drafts: FinancialContractDraft[],
    tierIdMap?: Map<string, string>,
  ): Promise<void> {
    if (!baseSkuId) {
      throw new Error("PricingGateway.syncContracts: baseSkuId required");
    }

    // 1. Snapshot live rows for diff.
    
    const { data: existing, error: fetchErr } = await supabase
      .from(TABLE)
      .select("id")
      .eq("sku_id", baseSkuId);
    if (fetchErr) throw new Error(fetchErr.message);
    const existingIds = new Set<string>(
      ((existing ?? []) as Array<{ id: string }>).map((r) => r.id),
    );

    // 2. Resolve packaging_tier_id for every draft and allocate UUIDs.
    type Resolved = { row: ContractRow; localContractId: string };
    const resolved: Resolved[] = [];
    for (const d of drafts) {
      let tierId: string | null = null;
      if (d.packaging_tier_local_id !== null) {
        const local = d.packaging_tier_local_id;
        const mapped = tierIdMap?.get(local);
        if (mapped) {
          tierId = mapped;
        } else if (isPersistedId(local)) {
          // Already a real DB id (re-edit of a previously saved tier).
          tierId = local;
        } else {
          Tracer.warn("commerce", "log", { args: [`[PricingGateway] dropping contract: unresolved tier id "${local}"`] });
          continue;
        }
      }
      const reuseId = isPersistedId(d.id) && existingIds.has(d.id);
      const realId = reuseId ? d.id : newUuid();
      resolved.push({
        localContractId: d.id,
        row: {
          id: realId,
          sku_id: baseSkuId,
          packaging_tier_id: tierId,
          pricing_model: d.pricing_model,
          base_price: Number(d.base_price ?? 0) || 0,
          currency: d.currency ?? "EGP",
          contract_rules: sanitizeRules(d.contract_rules),
          is_active: d.is_active !== false,
        },
      });
    }

    // 3. Upsert (single batch — no FK ordering needed since SKU + tiers
    //    are already persisted by the time we arrive here).
    if (resolved.length > 0) {
      const { error: upErr } = await supabase
        .from(TABLE)
        .upsert(
          resolved.map((r) => r.row) as never,
          { onConflict: "id" },
        );
      if (upErr) throw new Error(upErr.message);
    }

    // 4. Delete contracts the Admin removed.
    const keptIds = new Set(resolved.map((r) => r.row.id));
    const toDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));
    if (toDelete.length > 0) {
      
      const { error: delErr } = await supabase
        .from(TABLE)
        .delete()
        .eq("sku_id", baseSkuId)
        .in("id", toDelete);
      if (delErr) throw new Error(delErr.message);
    }
  },
};

export type PricingGatewayType = typeof PricingGateway;
