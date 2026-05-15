// Single borrowable book card. Pure presentation — opens the borrow sheet via callback.

import { BookOpen } from "lucide-react";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { fmtMoney } from "@/lib/format";
import { borrowStartingPrice } from "@/core/commerce/policies/deposits";
import { PALETTE } from "../data";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { Button } from "@/components/ui/button";

export const BorrowCard = ({
  product, onBorrow,
}: { product: Product; onBorrow: (p: Product) => void }) => (
  <Button
    onClick={() => onBorrow(product)}
    className="group flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-right shadow-soft ring-1 ring-border/50 transition hover:-translate-y-0.5 active:scale-[0.98]"
  >
    <OptimizedImage
      src={product.image}
      alt={product.name}
      width={128}
      height={160}
      wrapperClassName="h-20 w-16 shrink-0 rounded-xl ring-1 ring-border/50"
      className="h-full w-full object-cover"
    />
    <div className="flex-1">
      <p className="font-display text-sm font-extrabold leading-tight">{product.name}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{product.unit}</p>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold" style={{ color: PALETTE.primary }}>
        <BookOpen className="h-3.5 w-3.5" />
        <span>استعارة من {fmtMoney(borrowStartingPrice(product.price))}</span>
      </div>
    </div>
    <span className="rounded-full px-3 py-1.5 text-xs font-extrabold text-white" style={{ background: PALETTE.primary }}>استعِر</span>
  </Button>
);
