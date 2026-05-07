/**
 * Maeen Super-App Hub — Phase VIII Launcher Shell (UI-only).
 * ----------------------------------------------------------
 * 100% SDUI. All DB reads are delegated to kernel adapters
 * (`core-os/maeen/*`) — this component never imports `supabase`.
 */
import { useEffect } from "react";
import { useSduiLayout } from "@/core-os/sdui-engine/hooks/useSduiLayout";
import { SduiRenderer } from "@/core-os/sdui-engine/components/SduiRenderer";
import { HakimGenerativeOverlay } from "@/core-os/hakim-ai/generative/HakimGenerativeOverlay";
import { SalsabilStatusBar } from "@/core-os/ui/SalsabilStatusBar";
import { useAuth } from "@/context/AuthContext";
import { useActiveDelivery } from "@/core-os/maeen/useActiveDelivery";

const SLUG = "khalil_hub";
const TRACKING_BLOCK_ID = "hakim_barq_live";

const MaeenHub = () => {
  const { user } = useAuth();
  const { data: hasActiveDelivery } = useActiveDelivery(user?.id);

  useEffect(() => {
    if (hasActiveDelivery) {
      HakimGenerativeOverlay.injectBlock(SLUG, {
        type: "barq_tracking",
        id: TRACKING_BLOCK_ID,
        props: {
          title: "طلبك في الطريق",
          subtitle: "اضغط للمتابعة المباشرة",
        },
      });
    }
    return () => HakimGenerativeOverlay.clearInjectedBlocks(SLUG);
  }, [hasActiveDelivery]);

  const { blocks, loading } = useSduiLayout(SLUG);

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold tracking-tight text-foreground">
              معين
            </h1>
            <span className="text-[11px] font-bold text-muted-foreground">
              Salsabil OS
            </span>
          </div>
          <SalsabilStatusBar />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <SduiRenderer
            blocks={blocks}
            empty={
              <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                لم يتم تكوين تخطيط معين بعد.
              </div>
            }
          />
        )}
      </main>
    </div>
  );
};

export default MaeenHub;
