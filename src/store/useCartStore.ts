/**
 * @deprecated Phase P-1.1.D-β · Pure facade — re-exports the canonical
 * cart projection from `@/core/orders/runtime/projection`. This file
 * contains 0% logic; physical removal is scheduled for Wave P-1.1.D-γ.
 *
 * New code MUST import from `@/core/orders/runtime/projection` (or, for
 * intent dispatch, directly from `@/core/orders/runtime/CartRuntime`).
 */

export {
  useCartStore,
  useCartActions,
  useCartLineQty,
  useCartLinesArray,
  useCartTotalItems,
  lineKey,
  replaceCartLines,
  migrateLegacyCartShape,
  useShallow,
  useEffect,
  useMemo,
} from "@/core/orders/runtime/projection";

export type {
  CartLine,
  CartLineMeta,
  CartActions,
  CartState,
} from "@/core/orders/runtime/types";
