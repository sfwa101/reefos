/**
 * ProductPeekSheet — 80% bottom-sheet "peek" for a product.
 *
 * Built on `vaul` via the project's `Drawer` wrapper with two snap points
 * (80% on first open, 100% on full-drag). Composes the existing
 * `ProductGallery` + `StickyAddCTA` so detail logic stays single-sourced.
 *
 * Tap-to-open replacement for the route navigation on the Supermarket grid:
 * keeps the user in-context, supports drag-to-dismiss, and never blocks
 * the underlying scroll-spy state.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { useFavorites } from "@/lib/favorites";
import { getById } from "@/core/catalog/runtime/legacyRuntime";
import { fmtMoney } from "@/lib/format";

import ProductGallery from "../ProductGallery";
import StickyAddCTA from "../StickyAddCTA";

interface ProductPeekSheetProps {
  readonly productId: string | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const SNAP_POINTS: ReadonlyArray<number | string> = [0.8, 1];

const ProductPeekSheet = ({ productId, isOpen, onClose }: ProductPeekSheetProps) => {
  const product = productId ? getById(productId) : null;
  const { add } = useCart();
  const { has, toggle } = useFavorites();
  const [qty, setQty] = useState(1);
  const [addBurst, setAddBurst] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(0.8);

  // Reset transient state every time the sheet opens for a new product.
  useEffect(() => {
    if (isOpen) {
      setQty(1);
      setAddBurst(false);
      setSnap(0.8);
    }
  }, [isOpen, productId]);

  const images = useMemo<string[]>(
    () => (product?.image ? [product.image] : []),
    [product?.id],
  );

  if (!product) return null;

  const total = (Number(product.price) || 0) * qty;
  const fav = has(product.id);

  const handleAdd = () => {
    add(product, qty);
    setAddBurst(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        /* ignore */
      }
    }
    toast.success("أُضيف إلى السلة", { description: product.name });
    setTimeout(() => setAddBurst(false), 600);
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      snapPoints={SNAP_POINTS as Array<number | string>}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <DrawerContent className="h-[100dvh] max-h-[100dvh] p-0">
        <div className="flex h-full flex-col overflow-y-auto pb-32">
          <ProductGallery
            images={images}
            productName={product.name}
            productId={product.id}
            isVillage={product.source === "village"}
            fav={fav}
            toggleFav={() => void toggle(product.id)}
            onBack={onClose}
            onShare={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                void navigator.share({ title: product.name, url: window.location.href });
              }
            }}
          />

          <div className="flex flex-col gap-3 px-4 pt-4 text-right">
            {product.brand && (
              <p className="text-xs font-medium text-muted-foreground">{product.brand}</p>
            )}
            <h2 className="font-display text-xl font-extrabold leading-tight">
              {product.name}
            </h2>
            <p className="text-sm text-muted-foreground">{product.unit}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold tabular-nums">
                {fmtMoney(Number(product.price) || 0)}
              </span>
              {product.oldPrice ? (
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {fmtMoney(Number(product.oldPrice) || 0)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <StickyAddCTA
          qty={qty}
          setQty={setQty}
          total={total}
          priceFlash={0}
          addBurst={addBurst}
          onAdd={handleAdd}
          ctaLabel="أضف إلى السلة"
        />
      </DrawerContent>
    </Drawer>
  );
};

export default ProductPeekSheet;
