import { useUserRole } from "@/hooks/useUserRole";
import { usePosEngine } from "@/apps/reef-al-madina/features/pos/hooks/usePosEngine";
import { PosShiftManager } from "@/apps/reef-al-madina/features/pos/components/PosShiftManager";
import { PosBarcodeCart } from "@/apps/reef-al-madina/features/pos/components/PosBarcodeCart";
import { PosQuickPay } from "@/apps/reef-al-madina/features/pos/components/PosQuickPay";
import { ShieldAlert, Loader2, WifiOff } from "lucide-react";

export default function POSPage() {
  const { role, loading: roleLoading } = useUserRole();
  const allowed = role === "cashier" || role === "branch_manager" || role === "admin";

  const e = usePosEngine();

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
        <div className="bg-surface rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-border/40">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-[22px] mb-2">غير مصرَّح</h1>
          <p className="text-[13px] text-foreground-secondary">نقطة البيع للكاشير ومدير الفرع والإدارة فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background pb-6" dir="rtl">
      <main className="max-w-5xl mx-auto px-4 pt-3">
        <PosShiftManager
          shift={e.shift}
          loading={e.shiftLoading}
          onOpen={(b) => e.openShift(b, null)}
          onClose={e.closeShift}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
          <PosBarcodeCart
            query={e.query}
            setQuery={e.setQuery}
            filtered={e.filtered}
            cart={e.cart}
            onAdd={e.addProduct}
            onInc={e.incLine}
            onDec={e.decLine}
            onRemove={e.removeLine}
            disabled={!e.canSell}
          />
          <div className="lg:sticky lg:top-16 self-start">
            <PosQuickPay
              total={e.subtotal}
              itemCount={e.itemCount}
              disabled={!e.canSell}
              onPay={e.checkout}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
