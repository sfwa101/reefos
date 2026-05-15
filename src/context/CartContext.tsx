/**
 * @deprecated Phase P-1.1.D-β · Pure facade — re-exports the canonical
 * cart React layer from `@/core/orders/runtime/react/CartProvider`.
 * This file contains 0% logic; physical removal is scheduled for
 * Wave P-1.1.D-γ.
 *
 * New code MUST import from `@/core/orders/runtime/react/CartProvider`
 * (provider + selector hooks) or `@/core/orders/runtime/CartRuntime`
 * (intent dispatch).
 */

export {
  CartProvider,
  useCartLines,
  useCartCount,
  useCartLineQty,
  useCartActions,
  useCartLineBreakdown,
  useCartCheckoutRules,
  useCartTotal,
  useCartErrors,
  useCartHasErrors,
  useCartLoyalty,
  useCartProfit,
  useCart,
} from "@/core/orders/runtime/react/CartProvider";

export type {
  CartLineMeta,
  CartActions,
  CartCheckoutRules,
  CartLineError,
  CartLoyaltySummary,
  CartProfitSummary,
} from "@/core/orders/runtime/react/CartProvider";
