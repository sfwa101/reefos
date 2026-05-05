/**
 * SmartProductSheet — a 2/3-screen bottom sheet for product details.
 * Apple-Glass surface, sticky qty/price footer, gracefully degrades
 * on small viewports. Domain-agnostic; meat/sweets keep their
 * specialised sheets for now.
 */
import { memo, useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { useCartActions, useCartLineQty } from "@/context/CartContext";
import type { Product } from "@/lib/products";
import { toLatin } from "@/lib/format";

export interface SmartProductSheetProps {
  readonly product: Product | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

const SmartProductSheetImpl = ({ product, open, onClose }: SmartProductSheetProps) => {
  const { add, setQty } = useCartActions();
  const cartQty = useCartLineQty(product?.id ?? "");
  const [local, setLocal] = useState<number>(1);

  useEffect(() => {
    if (open) setLocal(Math.max(1, cartQty || 1));
  }, [open, cartQty]);

  if (!open || !product) return null;

  const total = product.price * local;
  const inc = () => setLocal((q) => Math.min(q + 1, 99));
  const dec = () => setLocal((q) => Math.max(1, q - 1));

  const handleConfirm = () => {
    if (cartQty > 0) setQty(product.id, local);
    else {
      for (let i = 0; i < local; i++) add(product);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md h-[66vh] overflow-hidden rounded-t-3xl border-t border-border/40 bg-card/80 backdrop-blur-2xl shadow-[0_-12px_40px_-16px_hsl(var(--foreground)/0.35)] animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5">
          <span aria-hidden className="h-1.5 w-12 rounded-full bg-foreground/15" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 ring-1 ring-border/40 backdrop-blur-md"
        >
          <X className="h-4 w-4" strokeWidth={2.4} />
        </button>

        {/* Scrollable body */}
        <div className="h-[calc(66vh-92px)] overflow-y-auto px-4 pb-4 pt-3">
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-background/40">
            <OptimizedImage
              src={product.image}
              alt={product.name}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="mt-3 space-y-1">
            <h2 className="font-display text-lg font-extrabold leading-tight text-foreground">
              {product.name}
            </h2>
            {product.brand && (
              <p className="text-[12px] text-muted-foreground">{product.brand}</p>
            )}
            <p className="text-[11.5px] text-muted-foreground">{product.unit}</p>
          </div>
          {product.description && (
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">
              {product.description}
            </p>
          )}
        </div>

        {/* Sticky footer: qty stepper + total + confirm */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border/40 bg-card/85 backdrop-blur-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-background/70 ring-1 ring-border/40 px-1.5 py-1">
              <button
                type="button"
                onClick={dec}
                aria-label="إنقاص"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 active:scale-95"
              >
                <Minus className="h-4 w-4" strokeWidth={2.6} />
              </button>
              <span className="min-w-6 text-center text-sm font-extrabold tabular-nums">
                {toLatin(local)}
              </span>
              <button
                type="button"
                onClick={inc}
                aria-label="زيادة"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>

            <div className="flex-1 text-right">
              <p className="text-[10.5px] text-muted-foreground">الإجمالي</p>
              <p className="font-display text-base font-extrabold tabular-nums">
                {toLatin(total)} <span className="text-[11px] font-bold">ج.م</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground shadow-[0_8px_18px_-8px_hsl(var(--primary)/0.55)] active:scale-95"
            >
              {cartQty > 0 ? "تحديث السلة" : "إضافة للسلة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SmartProductSheet = memo(SmartProductSheetImpl);
SmartProductSheet.displayName = "SmartProductSheet";

export default SmartProductSheet;
