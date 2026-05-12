// Cart / Shared-Cart Gateway (Wave P-D, Phase D-2)
// ------------------------------------------------------------------
// Sanctioned `createServerFn` handlers replacing direct
// `supabase.from(...)` calls in the cart orchestration / shared-cart
// sync layers. All handlers compose `requireSupabaseAuth` so RLS
// applies as the signed-in user; `userId` is taken from the validated
// bearer token, never from client input.
//
// SCOPE: replaces the writes/reads in
//   - src/apps/reef-al-madina/features/cart/hooks/useCartOrchestrator.ts
//   - src/apps/reef-al-madina/features/cart/hooks/useSharedCartSync.ts
// The realtime `supabase.channel(...)` subscription in `useSharedCartSync`
// is intentionally exempt from this gateway (Constitution Article 3 —
// realtime channels are part of the sanctioned data plane and cannot be
// proxied through `createServerFn`).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Checkout Context (orchestrator hydration) ────────────────────
export type CheckoutAddressRow = {
  id: string;
  label: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  building: string | null;
  is_default: boolean;
};

export type CheckoutContext = {
  addresses: CheckoutAddressRow[];
  wallet: { balance: number; credit_limit: number } | null;
  fullName: string;
};

export const getCheckoutContextFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CheckoutContext> => {
    const { supabase, userId } = context;
    const [addrRes, walletRes, profileRes] = await Promise.all([
      supabase
        .from("addresses")
        .select("id,label,city,district,street,building,is_default")
        .eq("user_id", userId)
        .order("is_default", { ascending: false }),
      supabase
        .from("wallets")
        .select("balance,credit_limit")
        .eq("user_id", userId)
        .eq("currency", "EGP")
        .maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);
    if (addrRes.error) throw new Error(addrRes.error.message);
    if (walletRes.error) throw new Error(walletRes.error.message);
    if (profileRes.error) throw new Error(profileRes.error.message);
    const w = walletRes.data as
      | { balance?: number | string; credit_limit?: number | string }
      | null;
    return {
      addresses: (addrRes.data as CheckoutAddressRow[] | null) ?? [],
      wallet: w
        ? { balance: Number(w.balance ?? 0), credit_limit: Number(w.credit_limit ?? 0) }
        : null,
      fullName: (
        ((profileRes.data as { full_name?: string } | null)?.full_name) ?? ""
      ).trim(),
    };
  });

// ─── Local cart purge (post-checkout) ─────────────────────────────
export const clearMyCartFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─── Shared Cart — Hydration ──────────────────────────────────────
export type SharedCartRow = {
  id: string;
  owner_id: string;
  status: "active" | "pending_approvals" | "frozen" | "completed" | "cancelled";
  title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SharedCartParticipantRow = {
  id: string;
  cart_id: string;
  user_id: string;
  role: "owner" | "contributor";
  split_type: "percentage" | "fixed" | "itemized";
  split_value: number;
  approval_status: "pending" | "approved" | "rejected";
  approved_at: string | null;
};

export type SharedCartItemRow = {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  meta: Record<string, unknown>;
  added_by: string;
  created_at: string;
  updated_at: string;
};

type HydrateSharedCartResult = {
  cart: SharedCartRow | null;
  participants: SharedCartParticipantRow[];
  items: SharedCartItemRow[];
};

export const hydrateSharedCartFn = createServerFn({ method: "GET" })
  .inputValidator((d: { cartId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      cart: SharedCartRow | null;
      participants: SharedCartParticipantRow[];
      items: SharedCartItemRow[];
    }> => {
      const { supabase } = context;
      const [cartRes, partsRes, itemsRes] = await Promise.all([
        supabase.from("shared_carts").select("*").eq("id", data.cartId).maybeSingle(),
        supabase.from("shared_cart_participants").select("*").eq("cart_id", data.cartId),
        supabase
          .from("shared_cart_items")
          .select("*")
          .eq("cart_id", data.cartId)
          .order("created_at", { ascending: true }),
      ]);
      if (cartRes.error) throw new Error(cartRes.error.message);
      if (partsRes.error) throw new Error(partsRes.error.message);
      if (itemsRes.error) throw new Error(itemsRes.error.message);
      return {
        cart: (cartRes.data as SharedCartRow | null) ?? null,
        participants: (partsRes.data as SharedCartParticipantRow[] | null) ?? [],
        items: (itemsRes.data as SharedCartItemRow[] | null) ?? [],
      };
    },
  );

// ─── Shared Cart — FSM transitions ────────────────────────────────
export const setSharedCartStatusFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      cartId: string;
      status: "active" | "pending_approvals" | "frozen" | "completed" | "cancelled";
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shared_carts")
      .update({ status: data.status })
      .eq("id", data.cartId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const resetSharedCartApprovalsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { cartId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shared_cart_participants")
      .update({ approval_status: "pending", approved_at: null })
      .eq("cart_id", data.cartId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setMyApprovalFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { participantId: string; status: "approved" | "rejected" }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch =
      data.status === "approved"
        ? { approval_status: "approved" as const, approved_at: new Date().toISOString() }
        : { approval_status: "rejected" as const, approved_at: null };
    const { error } = await supabase
      .from("shared_cart_participants")
      .update(patch)
      .eq("id", data.participantId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ─── Shared Cart — Item ops ───────────────────────────────────────
export const insertSharedCartItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      cartId: string;
      product_id: string;
      product_name: string;
      unit_price: number;
      quantity: number;
      meta: Record<string, unknown>;
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("shared_cart_items").insert([
      {
        cart_id: data.cartId,
        added_by: userId,
        product_id: data.product_id,
        product_name: data.product_name,
        unit_price: data.unit_price,
        quantity: data.quantity,
        meta: (data.meta ?? {}) as never,
      },
    ]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateSharedCartItemQtyFn = createServerFn({ method: "POST" })
  .inputValidator((d: { itemId: string; quantity: number }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shared_cart_items")
      .update({ quantity: data.quantity })
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteSharedCartItemFn = createServerFn({ method: "POST" })
  .inputValidator((d: { itemId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("shared_cart_items")
      .delete()
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
