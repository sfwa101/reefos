/**
 * ProductBlock — the canonical "Trillion-Dollar" product cell.
 *
 * Phase 20.03: rather than re-implement the rich behaviour already living
 * inside `ProductCard.tsx` (cart subscriptions, favourites, sweets/meat
 * sheets, perishable gating, volume badges), we expose a polished façade
 * that reuses it. The underlying surface is Apple-Glass styled
 * (bg-card/40 + backdrop-blur-xl + border-border/40 + shadow-glass).
 *
 * Future work can fork this into a registry-driven block (variants,
 * scheduling, addons adapters) without touching any consumer.
 */
import { memo } from "react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";

export interface ProductBlockProps {
  readonly product: Product;
  readonly variant?: "grid" | "carousel" | "wide";
  readonly volumeBadge?: { readonly buy: number; readonly save: number };
}

const ProductBlockImpl = (props: ProductBlockProps) => {
  return <ProductCard {...props} />;
};

export const ProductBlock = memo(ProductBlockImpl);
ProductBlock.displayName = "ProductBlock";

export default ProductBlock;
