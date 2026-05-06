// Cart persistence layer.
//
// Responsibilities:
// - Load remote cart for a logged-in user (one shot).
// - Push local cart changes to Supabase (debounced, replacement semantics).
// - Merge guest (localStorage) cart with remote cart on login.
//
// Schema: public.cart_items { user_id, product_id, qty, meta jsonb }.
// We treat (user_id, product_id, meta-signature) as the line identity, where
// meta-signature is a stable hash of variant/kind/booking/print fields.
// External reads must replace local state; never replay rows through add().

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_COLUMNS, rowToProduct, type DbRow, type Product } from "@/lib/products";
import type { CartLineMeta } from "@/context/CartContext";

export type RemoteLine = {
  product_id: string;
  qty: number;
  meta: CartLineMeta;
};

export type LocalLine = { product: Product; qty: number; meta?: CartLineMeta };

const lineKey = (line: LocalLine): string => {
  const meta = (line.meta ?? {}) as CartLineMeta & { variant_id?: string };
  return [
    line.product.id,
    meta.kind ?? "buy",
    meta.variantId ?? meta.variant_id ?? "",
    meta.bookingDate ?? "",
    meta.bookingSlot ?? "",
    meta.borrowDuration ?? "",
    (meta.addonIds ?? []).slice().sort().join(","),
    meta.printConfig
      ? `${meta.printConfig.pages}-${meta.printConfig.copies}-${meta.printConfig.colorMode}-${meta.printConfig.sided}-${meta.printConfig.binding}-${meta.printConfig.fileName ?? ""}`
      : "",
  ].join("|");
};

const dedupeForPush = (lines: LocalLine[]): LocalLine[] => {
  const map = new Map<string, LocalLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, qty: existing.qty + line.qty } : line);
  }
  return Array.from(map.values());
};

/** Fetch the products referenced by a remote cart in a single round-trip. */
async function fetchProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .in("id", ids);
  if (error || !data) return map;
  for (const row of data as DbRow[]) {
    const p = rowToProduct(row);
    map.set(p.id, p);
  }
  return map;
}

/** Fetch the current user's persisted cart. Returns [] if not logged in. */
export async function fetchRemoteCart(userId: string): Promise<LocalLine[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, qty, meta")
    .eq("user_id", userId);

  if (error || !Array.isArray(data)) return [];

  const ids = Array.from(new Set(data.map((r) => r.product_id).filter(Boolean)));
  const productMap = await fetchProductsByIds(ids);

  const lines: LocalLine[] = [];
  for (const row of data) {
    const product = productMap.get(row.product_id);
    if (!product) continue; // product no longer exists — skip silently
    lines.push({
      product,
      qty: Math.max(1, Number(row.qty) || 1),
      meta: (row.meta ?? {}) as CartLineMeta,
    });
  }
  return lines;
}

/**
 * Replace the user's remote cart with the given local lines.
 * Uses delete-then-insert for simplicity. Safe because the user owns the rows
 * via RLS, and the operation runs only when the user is authenticated.
 */
export async function pushRemoteCart(
  userId: string,
  lines: LocalLine[],
): Promise<void> {
  const cleanLines = dedupeForPush(lines).filter((l) => l.qty > 0);
  // 1) clear current rows
  const del = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (del.error) {
    console.warn("[cart] failed to clear remote cart:", del.error.message);
    return;
  }
  if (cleanLines.length === 0) return;

  // 2) insert fresh rows
  const rows = cleanLines.map((l) => ({
    user_id: userId,
    product_id: l.product.id,
    qty: l.qty,
    // CartLineMeta is JSON-serializable (POJOs only — Modifier objects
    // are plain shapes). The Database type widens to Json, so cast.
    meta: (l.meta ?? {}) as never,
  }));
  const ins = await supabase.from("cart_items").insert(rows);
  if (ins.error) {
    console.warn("[cart] failed to insert remote cart:", ins.error.message);
  }
}

/**
 * Merge a guest cart with a remote cart.
 * Strategy (no duplicates):
 *  - Same product_id + matching meta-signature → sum qty.
 *  - Otherwise → keep both as separate lines.
 */
export function mergeCarts(
  guest: LocalLine[],
  remote: LocalLine[],
): LocalLine[] {
  const out: LocalLine[] = [...remote];
  for (const g of guest) {
    const idx = out.findIndex(
      (r) =>
        r.product.id === g.product.id && metaSignature(r.meta) === metaSignature(g.meta),
    );
    if (idx >= 0) {
      out[idx] = { ...out[idx], qty: out[idx].qty + g.qty };
    } else {
      out.push(g);
    }
  }
  return out;
}

/** Stable signature of meta fields that affect line identity. */
function metaSignature(meta?: CartLineMeta): string {
  if (!meta) return "";
  const sig = {
    kind: meta.kind ?? "buy",
    variantId: meta.variantId ?? "",
    bookingDate: meta.bookingDate ?? "",
    bookingSlot: meta.bookingSlot ?? "",
    borrowDuration: meta.borrowDuration ?? "",
    printConfigKey: meta.printConfig
      ? `${meta.printConfig.pages}-${meta.printConfig.copies}-${meta.printConfig.colorMode}-${meta.printConfig.sided}-${meta.printConfig.binding}-${meta.printConfig.fileName ?? ""}`
      : "",
    addonIds: (meta.addonIds ?? []).slice().sort().join(","),
  };
  return JSON.stringify(sig);
}
