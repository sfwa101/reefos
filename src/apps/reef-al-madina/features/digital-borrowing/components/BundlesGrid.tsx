// Curated student bundles (backpacks, exam kits…) rendered as a stacked grid.

import { toast } from "sonner";
import { useCartActions } from "@/core/orders/runtime/react/CartProvider";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { fmtMoney } from "@/lib/format";
import { LIBRARY_BUNDLES } from "@/lib/digital-borrowing";
import { PALETTE } from "../data";
import { Button } from "@/components/ui/button";

export const BundlesGrid = () => {
  const { add } = useCartActions();
  const handleAdd = (bundle: typeof LIBRARY_BUNDLES[number]) => {
    const virtual: Product = {
      id: bundle.id, name: bundle.name, unit: bundle.subtitle,
      price: bundle.price, oldPrice: bundle.oldPrice,
      image: "", category: "حزم طلابية", source: "library", badge: "best",
    };
    add(virtual, 1, { kind: "buy" });
    toast.success(`تمت إضافة "${bundle.name}" للسلة`);
  };
  return (
    <div className="space-y-2.5">
      {LIBRARY_BUNDLES.map((b) => (
        <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/50">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: PALETTE.primarySoft }}>
            {b.emoji}
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-extrabold leading-tight">{b.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{b.subtitle}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-base font-extrabold" style={{ color: PALETTE.primary }}>{fmtMoney(b.price)}</span>
              {b.oldPrice && <span className="text-[11px] text-muted-foreground line-through">{fmtMoney(b.oldPrice)}</span>}
            </div>
          </div>
          <Button onClick={() => handleAdd(b)} className="rounded-full px-3 py-2 text-xs font-extrabold text-white" style={{ background: PALETTE.primary }}>
            أضف
          </Button>
        </div>
      ))}
    </div>
  );
};
