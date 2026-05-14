/**
 * Saved Baskets — DB sovereignty layer (Phase 4.4)
 * -------------------------------------------------
 * Single API for `public.saved_baskets`. Replaces the legacy
 * localStorage subscription store (`reef-subscriptions-v1`).
 *
 * Schema: { id, user_id, name, source, items jsonb, is_active }
 *  - source = 'subscription' → recurring baskets (this file's primary use)
 *  - source = 'manual'       → user-saved baskets (future)
 *  - source = 'predicted'    → Hakim AI-suggested baskets (Part 5)
 *
 * For subscriptions we serialise the SubscriptionRecord meta into `items`
 * as a single JSON object alongside the line array, so we can rehydrate
 * without schema changes:
 *   items = {
 *     lines: [{ productId, qty, swap? }, ...],   // future-friendly
 *     meta:  { basketId, basketImage, basketPrice, frequency,
 *              nextDelivery, paused, giftMode, swaps }
 *   }
 */
import { supabase } from "@/integrations/supabase/client";
import {
  STORAGE,
  type SubscriptionRecord,
  type SubFrequencyId,
} from "@/core/commerce/policies/bundle-thresholds";

type SubItemsBlob = {
  lines: Array<{ productId: string; qty?: number }>;
  meta: {
    basketId: string;
    basketImage: string;
    basketPrice: number;
    frequency: SubFrequencyId;
    nextDelivery: string;
    paused: boolean;
    swaps: Record<string, string>;
    giftMode?: boolean;
  };
};

const toRecord = (row: {
  id: string;
  name: string;
  items: unknown;
  created_at: string;
}): SubscriptionRecord | null => {
  const blob = row.items as SubItemsBlob | null;
  if (!blob || !blob.meta) return null;
  return {
    id: row.id,
    basketId: blob.meta.basketId,
    basketName: row.name,
    basketImage: blob.meta.basketImage,
    basketPrice: blob.meta.basketPrice,
    frequency: blob.meta.frequency,
    nextDelivery: blob.meta.nextDelivery,
    swaps: blob.meta.swaps ?? {},
    paused: blob.meta.paused ?? false,
    createdAt: row.created_at,
    giftMode: blob.meta.giftMode,
  };
};

const toBlob = (rec: SubscriptionRecord): SubItemsBlob => ({
  lines: [{ productId: rec.basketId, qty: 1 }],
  meta: {
    basketId: rec.basketId,
    basketImage: rec.basketImage,
    basketPrice: rec.basketPrice,
    frequency: rec.frequency,
    nextDelivery: rec.nextDelivery,
    paused: rec.paused,
    swaps: rec.swaps ?? {},
    giftMode: rec.giftMode,
  },
});

/** Fetch all subscription rows for the signed-in user. */
export async function listSubscriptions(
  userId: string,
): Promise<SubscriptionRecord[]> {
  const { data, error } = await supabase
    .from("saved_baskets")
    .select("id, name, items, created_at")
    .eq("user_id", userId)
    .eq("source", "subscription")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[savedBaskets] list failed:", error);
    return [];
  }
  return (data ?? [])
    .map((r) => toRecord(r as never))
    .filter((r): r is SubscriptionRecord => Boolean(r));
}

/** Insert a new subscription row. Returns the assigned row id. */
export async function createSubscription(
  userId: string,
  rec: Omit<SubscriptionRecord, "id" | "createdAt">,
): Promise<string | null> {
  const draft: SubscriptionRecord = {
    ...rec,
    id: "pending",
    createdAt: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("saved_baskets")
    .insert({
      user_id: userId,
      name: rec.basketName,
      source: "subscription",
      items: toBlob(draft) as unknown as never,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[savedBaskets] create failed:", error);
    return null;
  }
  return data?.id ?? null;
}

/** Patch an existing subscription (pause/resume, reschedule, swaps). */
export async function updateSubscription(
  rec: SubscriptionRecord,
): Promise<boolean> {
  const { error } = await supabase
    .from("saved_baskets")
    .update({
      name: rec.basketName,
      items: toBlob(rec) as unknown as never,
    })
    .eq("id", rec.id);
  if (error) {
    console.error("[savedBaskets] update failed:", error);
    return false;
  }
  return true;
}

/** Soft-delete (sets is_active = false) so analytics keep the row. */
export async function deleteSubscription(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_baskets")
    .update({ is_active: false })
    .eq("id", id);
  if (error) {
    console.error("[savedBaskets] delete failed:", error);
    return false;
  }
  return true;
}

/**
 * One-shot migration: if legacy localStorage subscriptions exist,
 * push them to the DB and clear the local key.
 * Idempotent — safe to call on every mount.
 */
export async function migrateLegacySubscriptions(
  userId: string,
): Promise<number> {
  if (typeof window === "undefined") return 0;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE.subscriptions);
  } catch {
    return 0;
  }
  if (!raw) return 0;
  let legacy: SubscriptionRecord[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) legacy = parsed as SubscriptionRecord[];
  } catch {
    /* ignore */
  }
  if (legacy.length === 0) {
    try {
      window.localStorage.removeItem(STORAGE.subscriptions);
    } catch {
      /* ignore */
    }
    return 0;
  }

  const rows = legacy.map((rec) => ({
    user_id: userId,
    name: rec.basketName,
    source: "subscription" as const,
    items: toBlob(rec) as unknown as never,
  }));
  const { error } = await supabase.from("saved_baskets").insert(rows);
  if (error) {
    console.error("[savedBaskets] migrate failed:", error);
    return 0;
  }
  try {
    window.localStorage.removeItem(STORAGE.subscriptions);
  } catch {
    /* ignore */
  }
  return legacy.length;
}
