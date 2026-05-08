/**
 * MaeenLauncherGrid — Phase 29 Stem Cell.
 * ---------------------------------------
 * Self-contained Maeen Hub launcher section. The legacy `sdui_layouts` row
 * (slug `khalil_hub`) still drives the in-grid blocks and the Hakim live
 * tracking injection — but now wrapped as a single SDUI section so the
 * `<MaeenHub />` page can be a pure `<LayoutFactory pageKey="maeen_hub" />`
 * shell on the Sovereign Matrix.
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

export const MaeenLauncherGrid = () => {
  const { user } = useAuth();
  const { data: hasActiveDelivery } = useActiveDelivery(user?.id);

  useEffect(() => {
    if (hasActiveDelivery) {
      HakimGenerativeOverlay.injectBlock(SLUG, {
        type: "barq_tracking",
        id: TRACKING_BLOCK_ID,
        props: { title: "طلبك في الطريق", subtitle: "اضغط للمتابعة المباشرة" },
      });
    }
    return () => HakimGenerativeOverlay.clearInjectedBlocks(SLUG);
  }, [hasActiveDelivery]);

  const { blocks, loading } = useSduiLayout(SLUG);

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold tracking-tight text-foreground">معين</h1>
        <span className="text-[11px] font-bold text-muted-foreground">Salsabil OS</span>
      </div>
      <SalsabilStatusBar />

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
    </div>
  );
};

export default MaeenLauncherGrid;
