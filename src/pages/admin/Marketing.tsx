import { lazy, Suspense, useState } from "react";
import { Image as ImageIcon, Tag, Zap } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded panels (each tab loads independently)
const BannersPanel = lazy(() => import("@/features/admin/marketing/BannersPanel"));
const FlashPanel = lazy(() => import("@/features/admin/marketing/FlashPanel"));
const CouponsPanel = lazy(() => import("@/features/admin/marketing/CouponsPanel"));

type TabKey = "banners" | "coupons" | "flash";

const PanelFallback = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}
    </div>
    <Skeleton className="h-64 rounded-3xl" />
  </div>
);

export default function Marketing() {
  const [tab, setTab] = useState<TabKey>("banners");

  return (
    <>
      <MobileTopbar title="مركز التسويق" />
      <div className="hidden lg:block px-6 pt-8 pb-3 max-w-[1400px] mx-auto">
        <h1 className="font-display text-[30px] tracking-tight">مركز التسويق</h1>
        <p className="text-[13px] text-foreground-secondary mt-1">
          البانرات الحية، الكوبونات الذكية، وعروض الفلاش — كل شيء في واجهة واحدة.
        </p>
      </div>

      <div className="px-4 lg:px-6 pt-3 pb-10 max-w-[1400px] mx-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-surface-muted rounded-2xl p-1 mb-5">
            <TabsTrigger value="banners" className="rounded-xl gap-2 text-[13px]">
              <ImageIcon className="h-4 w-4" /> البانرات
            </TabsTrigger>
            <TabsTrigger value="flash" className="rounded-xl gap-2 text-[13px]">
              <Zap className="h-4 w-4" /> عروض الفلاش
            </TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-xl gap-2 text-[13px]">
              <Tag className="h-4 w-4" /> الكوبونات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="mt-0">
            <Suspense fallback={<PanelFallback />}>
              <BannersPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="flash" className="mt-0">
            <Suspense fallback={<PanelFallback />}>
              <FlashPanel />
            </Suspense>
          </TabsContent>
          <TabsContent value="coupons" className="mt-0">
            <Suspense fallback={<PanelFallback />}>
              <CouponsPanel />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
