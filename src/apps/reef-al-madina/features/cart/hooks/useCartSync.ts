/**
 * useCartSync — Atomized hook (Operation Cart-Atomize).
 *
 * Owns server-sync concerns for the cart shell:
 *   • Hydrates the checkout context (addresses, wallet, trust limit, customer
 *     name) via the sanctioned Cart Gateway server function.
 *   • Exposes `purgeRemoteCart()` to hard-delete the persisted cart rows
 *     after a successful checkout.
 *
 * Constitutional contract: this hook NEVER touches `supabase.from(...)`
 * directly — every read/write goes through `@/core/orders/cart.functions`,
 * which fronts the Sovereign Cart Gateway.
 */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCheckoutContextFn,
  clearMyCartFn,
} from "@/core/orders/cart.functions";
import { Tracer } from "@/core/system/observability/Tracer";
import type { Addr } from "../types/cart.types";

export type CartSyncApi = {
  addresses: Addr[];
  addrId: string;
  setAddrId: (id: string) => void;
  customerName: string;
  walletBalance: number;
  trustLimit: number;
  purgeRemoteCart: () => Promise<void>;
};

export const useCartSync = (user: User | null): CartSyncApi => {
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [trustLimit, setTrustLimit] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setAddrId("");
      setWalletBalance(0);
      setTrustLimit(0);
      setCustomerName("");
      return;
    }
    (async () => {
      try {
        const ctx = await getCheckoutContextFn();
        const list = (ctx.addresses as Addr[]) ?? [];
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) setAddrId(def.id);
        setWalletBalance(Number(ctx.wallet?.balance ?? 0));
        setTrustLimit(Number(ctx.wallet?.credit_limit ?? 0));
        setCustomerName(ctx.fullName);
      } catch (e) {
        Tracer.warn("checkout", "hydrate_context_failed", { error: String(e) });
      }
    })();
  }, [user]);

  const purgeRemoteCart = async () => {
    try {
      await clearMyCartFn();
    } catch (e) {
      Tracer.warn("checkout", "purge_remote_cart_failed", { error: String(e) });
    }
  };

  return {
    addresses,
    addrId,
    setAddrId,
    customerName,
    walletBalance,
    trustLimit,
    purgeRemoteCart,
  };
};
