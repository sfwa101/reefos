import { usePosEngine } from "@/apps/reef-al-madina/features/pos/hooks/usePosEngine";
import { PosShiftManager } from "@/apps/reef-al-madina/features/pos/components/PosShiftManager";
import { PosBarcodeCart } from "@/apps/reef-al-madina/features/pos/components/PosBarcodeCart";
import { PosQuickPay } from "@/apps/reef-al-madina/features/pos/components/PosQuickPay";
import { PosSyncPill } from "@/components/pos/PosSyncPill";
import { FloatingGuardian } from "@/components/hakim/FloatingGuardian";
import { useCapability } from "@/hooks/useCapability";
import { ShieldAlert, Loader2, Store } from "lucide-react";

export default function POSPage() {
  // Phase 65 — capability-driven gate (admin bypass + reef.pos.access).
  const { allowed, loading: roleLoading } = useCapability("reef.pos.access");

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
        <header className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <h1 className="font-display text-[15px]">نقطة البيع</h1>
          </div>
          <div className="flex items-center gap-2">
            <FloatingGuardian workspace="pos" inline />
            <PosSyncPill online={e.online} />
          </div>
        </header>
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
