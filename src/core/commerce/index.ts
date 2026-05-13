/**
 * Commerce public API — UI MUST import only from here for commercial graph
 * traversals (orders, shared-cart participants, buy-it-again).
 */
export { CommerceGateway, type SharedCartSplitType } from "./gateway/CommerceGateway";
export { PackagingGateway } from "./gateway/PackagingGateway";
export type {
  PackagingTier,
  PackagingTierDraft,
  PackagingTierNode,
} from "./types/packagingTier";
