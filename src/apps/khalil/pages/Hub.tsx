/**
 * Khalil Super-App Hub — Phase VIII Launcher Shell.
 * -------------------------------------------------
 * 100% SDUI. Pulls layout `khalil_hub` from Supabase and renders via
 * SduiRenderer. Active-delivery detection injects a live "Barq Tracking"
 * block at the top through HakimGenerativeOverlay (cognitive interception).
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSduiLayout } from "@/core-os/sdui-engine/hooks/useSduiLayout";
import { SduiRenderer } from "@/core-os/sdui-engine/components/SduiRenderer";
import { HakimGenerativeOverlay } from "@/core-os/hakim-ai/generative/HakimGenerativeOverlay";
import { SalsabilStatusBar } from "@/core-os/ui/SalsabilStatusBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SLUG = "khalil_hub";
const TRACKING_BLOCK_ID = "hakim_barq_live";

const KhalilHub = () => {
  const { user } = useAuth();

  // Detect active delivery (status not in terminal set).
  const { data: hasActiveDelivery } = useQuery({
    queryKey: ["khalil", "active-delivery", user?.id ?? "_anon"],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .in("status", ["pending", "confirmed", "preparing", "out_for_delivery"]);
      return (count ?? 0) > 0;
    },
  });

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
              الديوان
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
                لم يتم تكوين تخطيط خليل بعد.
              </div>
            }
          />
        )}
      </main>
    </div>
  );
};

export default KhalilHub;
