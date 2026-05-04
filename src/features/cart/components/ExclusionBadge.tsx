import { ShieldCheck } from "lucide-react";

interface Props {
  /**
   * Optional explicit message override. When omitted, the badge uses
   * the canonical Phase 9.1 copy approved by the merchandising team.
   */
  readonly message?: string;
}

/**
 * Phase 9.1 — minimalist luxury badge shown next to cart line items
 * that opt out of further discounts via metadata
 * (`excludeFromDiscounts === true`) OR belong to an excluded section
 * (e.g. tobacco, weekly specials).
 *
 * Pure presentation — no business logic. Cart line components decide
 * whether to render it based on `useCartLineBreakdown` / metadata.
 */
export const ExclusionBadge = ({ message }: Props) => {
  const text =
    message ??
    "هذا المنتج يتمتع بأفضل سعر بيع مباشر ولا يخضع لخصومات إضافية";
  return (
    <div
      role="note"
      aria-label="منتج مستثنى من الخصومات"
      className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-gradient-to-l from-amber-50/80 to-transparent px-2 py-1 ring-1 ring-amber-300/40 dark:from-amber-500/10 dark:ring-amber-400/20"
    >
      <ShieldCheck
        className="mt-px h-3 w-3 flex-shrink-0 text-amber-700 dark:text-amber-300"
        strokeWidth={2.6}
      />
      <p className="text-[10px] font-extrabold leading-snug text-amber-800 dark:text-amber-200">
        {text}
      </p>
    </div>
  );
};
