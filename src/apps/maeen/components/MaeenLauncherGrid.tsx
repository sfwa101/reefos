/**
 * MaeenLauncherGrid — Phase P0.1 (migrated out of `src/apps/khalil/`).
 * --------------------------------------------------------------------
 * Self-contained Maeen Hub launcher section. The legacy `sdui_layouts`
 * row still uses slug `khalil_hub` for data-identity continuity; renaming
 * the row requires a dedicated schema-migration ADR and is intentionally
 * deferred (see `.salsabil/domains/khalil/p0.1-coupling-risk.md`).
 *
 * Sovereign owner: Maeen domain. Khalil MUST NOT import this component.
 */
import { useEffect } from "react";
import { useSduiLayout } from "@/core/runtime-ui/sdui/hooks/useSduiLayout";
import { SduiRenderer } from "@/core/runtime-ui/sdui/components/SduiRenderer";
import { HakimGenerativeOverlay } from "@/core/hakim-ai/generative/HakimGenerativeOverlay";
import { SalsabilStatusBar } from "@/components/system/SalsabilStatusBar";
import { useAuth } from "@/context/AuthContext";
import { useActiveDelivery } from "@/core/maeen/useActiveDelivery";

/** Legacy SDUI slug — retained for DB compatibility (see coupling-risk). */
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
