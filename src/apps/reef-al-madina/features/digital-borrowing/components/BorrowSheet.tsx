// Borrow duration picker + price summary dialog.

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useCartActions } from "@/core/orders/runtime/react/CartProvider";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { fmtMoney, toLatin } from "@/lib/format";
import {
  BORROW_DURATIONS, calcBorrowPrice, type BorrowDuration,
} from "@/lib/digital-borrowing";
import { libraryBorrowToModifiers } from "@/core/commerce/pricing/adapters";
import { PALETTE } from "../data";
import { Button } from "@/components/ui/button";

export const BorrowSheet = ({
  product, open, onOpenChange,
}: { product: Product | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const [duration, setDuration] = useState<BorrowDuration>("7d");
  const { add } = useCartActions();

  if (!product) return null;
  const { rental, deposit, total } = calcBorrowPrice(product.price, duration);
  const days = BORROW_DURATIONS.find((d) => d.id === duration)!.days;

  const confirm = () => {
    add(product, 1, {
      kind: "borrow",
      borrowDuration: duration,
      borrowDays: days,
      borrowDeposit: deposit,
      unitPrice: total,
      // Stem-cell modifiers (Phase 2)
      appliedModifiers: libraryBorrowToModifiers(product.price, duration),
    });
    toast.success(`تمت إضافة "${product.name}" للاستعارة (${days} أيام)`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-right font-display">{product.name}</DialogTitle>
          <DialogDescription className="text-right">اختر مدة الاستعارة المناسبة</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {BORROW_DURATIONS.map((d) => {
            const active = d.id === duration;
            const p = calcBorrowPrice(product.price, d.id).rental;
            return (
              <Button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={`rounded-2xl p-3 text-center text-xs font-extrabold transition ${active ? "text-white" : "bg-foreground/5 text-foreground"}`}
                style={active ? { background: PALETTE.primary } : undefined}
              >
                <p>{d.label}</p>
                <p className={`mt-1 text-[11px] ${active ? "opacity-90" : "text-muted-foreground"}`}>{toLatin(p)} ج.م</p>
              </Button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2 rounded-2xl p-3" style={{ background: PALETTE.primarySoft }}>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">سعر الاستعارة</span><span className="font-bold">{fmtMoney(rental)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">تأمين مسترد</span><span className="font-bold">{fmtMoney(deposit)}</span></div>
          <div className="border-t pt-2 flex justify-between"><span className="font-extrabold">الإجمالي</span><span className="font-display text-lg font-extrabold" style={{ color: PALETTE.primary }}>{fmtMoney(total)}</span></div>
        </div>

        <div className="rounded-xl bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
          ⚠️ يُسترد التأمين كاملاً للمحفظة عند إرجاع الكتاب بحالة جيدة. غرامة التأخير: <strong>5 ج.م/يوم</strong> تُخصم من التأمين.
        </div>

        <Button onClick={confirm} className="mt-2 w-full rounded-2xl py-3.5 text-sm font-extrabold text-white" style={{ background: PALETTE.primary }}>
          أضف للسلة — {fmtMoney(total)}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
