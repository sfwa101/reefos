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

/** Wave P-3 — all `cart_items` I/O routed through the Sovereign CartGateway. */
import { CartGateway } from "@/core/orders/gateway/CartGateway";
/** @deprecated Wave P-B B-3 — bridge type for legacy cart-row hydration. */
import { type Product } from "@/core/catalog/legacyProduct.types";
import type { CartLineMeta } from "@/core/orders/runtime/react/CartProvider";
import { fetchAssetsByLegacyIds, assetToProduct } from "@/core/commerce/knowledge/sovereignCatalog";
import { Tracer } from "@/core/system/observability/Tracer";

export type RemoteLine = {
  product_id: string;
  qty: number;
  meta: CartLineMeta;
};

export type LocalLine = {
  product: Product;
  qty: number;
  meta?: CartLineMeta;
  /** Wave P-B — frozen unit price written into `meta.unitPrice` on push. */
  capturedPrice?: number;
  capturedName?: string;
  capturedImage?: string;
};

/** Stable line identity (excludes product id; combined with product_id at the row level). */
export const computeLineKey = (meta?: CartLineMeta): string => {
  const m = (meta ?? {}) as CartLineMeta & { variant_id?: string };
  return [
    m.kind ?? "buy",
    m.variantId ?? m.variant_id ?? "",
    m.bookingDate ?? "",
    m.bookingSlot ?? "",
    m.borrowDuration ?? "",
    (m.addonIds ?? []).slice().sort().join(","),
    m.printConfig
      ? `${m.printConfig.pages}-${m.printConfig.copies}-${m.printConfig.colorMode}-${m.printConfig.sided}-${m.printConfig.binding}-${m.printConfig.fileName ?? ""}`
      : "",
  ].join("|");
};

const lineKey = (line: LocalLine): string =>
  `${line.product.id}|${computeLineKey(line.meta)}`;

const dedupeForPush = (lines: LocalLine[]): LocalLine[] => {
  const map = new Map<string, LocalLine>();
  for (const line of lines) {
    const key = lineKey(line);
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, qty: existing.qty + line.qty } : line);
  }
  return Array.from(map.values());
};

/** Resolve cart product_ids to full Products via the Sovereign Catalog. */
async function fetchProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  if (ids.length === 0) return map;
  const assets = await fetchAssetsByLegacyIds(ids);
  for (const row of assets) {
    const p = assetToProduct(row);
    if (p) map.set(p.id, p);
  }
  return map;
}

/** Fetch the current user's persisted cart. Returns [] if not logged in. */
export async function fetchRemoteCart(userId: string): Promise<LocalLine[]> {
  const data = await CartGateway.fetchUserCart(userId);
  if (data.length === 0) return [];

  const ids = Array.from(new Set(data.map((r) => r.product_id).filter(Boolean)));
  const productMap = await fetchProductsByIds(ids);

  const lines: LocalLine[] = [];
  for (const row of data) {
    const product = productMap.get(row.product_id);
    if (!product) continue;
    const meta = (row.meta ?? {}) as CartLineMeta;
    // Wave P-B — derive captured snapshot from persisted meta + product fallback.
    const capturedPrice = meta.unitPrice ?? product.price;
    lines.push({
      product,
      qty: Math.max(1, Number(row.qty) || 1),
      meta,
      capturedPrice,
      capturedName: product.name,
      capturedImage: product.image,
    });
  }
  return lines;
}

/**
 * Idempotent upsert into cart_items keyed by (user_id, product_id, line_key).
 * Replaces previous DELETE+INSERT pattern that self-echoed through Realtime.
 * Lines absent from `lines` are deleted in a single follow-up DELETE.
 */
export async function pushRemoteCart(
  userId: string,
  lines: LocalLine[],
): Promise<void> {
  const cleanLines = dedupeForPush(lines).filter((l) => l.qty > 0);

  if (cleanLines.length === 0) {
    const { error } = await CartGateway.clearUserCart(userId);
    if (error) Tracer.warn("lib", "cart_failed_to_clear_remote_cart", { args: ["[cart] failed to clear remote cart:", error] });
    return;
  }

  const rows = cleanLines.map((l) => {
    // Wave P-B — preserve `capturedPrice` across the network boundary by
    // pinning it into `meta.unitPrice`. The cart calc layer already prefers
    // `meta.unitPrice → capturedPrice → product.price` in that order.
    const meta: CartLineMeta = {
      ...(l.meta ?? {}),
      ...(l.capturedPrice !== undefined && l.meta?.unitPrice === undefined
        ? { unitPrice: l.capturedPrice }
        : {}),
    };
    return {
      user_id: userId,
      product_id: l.product.id,
      line_key: computeLineKey(meta),
      qty: l.qty,
      meta: meta as never,
    };
  });

  // Upsert all rows in one round-trip.
  const { error: upErr } = await CartGateway.upsertCartRows(rows);
  if (upErr) {
    Tracer.warn("lib", "cart_upsert_failed", { args: ["[cart] upsert failed:", upErr] });
    return;
  }

  // Delete any rows that are no longer in the local cart.
  const keepKeys = rows.map((r) => `${r.product_id}::${r.line_key}`);
  const existing = await CartGateway.listCartKeys(userId);
  if (existing.length > 0) {
    const stale = existing
      .filter((r) => !keepKeys.includes(`${r.product_id}::${r.line_key ?? ""}`))
      .map((r) => r.id);
    if (stale.length > 0) {
      await CartGateway.deleteCartRowsByIds(stale);
    }
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
