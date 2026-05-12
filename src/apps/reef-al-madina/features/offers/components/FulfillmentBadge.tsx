import type { Product } from "@/core/catalog/legacy/legacyProduct.types";
import {
  fulfillmentMeta,
  fulfillmentTypeFor,
  isSweetsProduct,
} from "@/lib/sweetsFulfillment";
import { Calendar, Truck } from "lucide-react";

export type FulfillmentBadgeProps = {
  product: Pick<Product, "id" | "subCategory" | "source">;
  className?: string;
};

/**
 * Tiny visual hint shown on offer cards: "حجز مسبق", "يصلك غداً", "جاهز".
 * Reads from the existing sweets fulfillment engine for sweets, and falls back
 * to a generic "جاهز للشحن" for everything else so the offer page never lies.
 */
const FulfillmentBadge = ({ product, className = "" }: FulfillmentBadgeProps) => {
  if (isSweetsProduct(product.source)) {
    const meta = fulfillmentMeta[fulfillmentTypeFor(product.id, product.subCategory)];
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badgeBg} ${meta.badgeText} ${className}`}
      >
        {meta.type === "C" ? (
          <Calendar className="h-3 w-3" />
        ) : (
          <Truck className="h-3 w-3" />
        )}
        {meta.badge}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold text-white ${className}`}
    >
      <Truck className="h-3 w-3" />
      يصلك اليوم
    </span>
  );
};

export default FulfillmentBadge;
