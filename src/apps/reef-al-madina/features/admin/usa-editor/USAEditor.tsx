/**
 * USAEditor — Phase 7 Part 4.
 * Slide-over Sheet (RTL, max-w-2xl) for editing a Universal Salsabil Asset.
 * Tabs: أساسي · العقود المالية · المخزون · التكوين الذكي (embeds VisionGenesisUploader).
 * Update RPCs (basic/financial/inventory) are wired in Part 5; placeholders for now.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Layers, Wallet, Boxes, Wrench } from "lucide-react";
import VisionGenesisUploader from "@/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader";

export interface USARecord {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  traits: unknown;
  is_active: boolean;
  created_at: string;
  base_price?: number | null;
  currency?: string | null;
  pricing_model?: string | null;
  skus_count?: number;
}

interface Props {
  open: boolean;
  asset: USARecord | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ASSET_TYPE_LABELS: Record<string, string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
  rental: "إيجار",
  milestone_project: "مشروع بمراحل",
};

const Placeholder = ({ icon: Icon, title, hint }: { icon: typeof Wrench; title: string; hint: string }) => (
  <div className="rounded-3xl border border-dashed border-border/60 bg-background-secondary/40 p-8 text-center">
    <div className="mx-auto inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-3">
      <Icon className="h-7 w-7 text-primary" />
    </div>
    <p className="font-display text-[15px] mb-1">{title}</p>
    <p className="text-[12px] text-foreground-tertiary leading-relaxed max-w-sm mx-auto">{hint}</p>
    <span className="inline-block mt-4 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full">
      الجزء الخامس · قريباً
    </span>
  </div>
);

export default function USAEditor({ open, asset, onClose }: Props) {
  const isNew = !asset;
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="left"
        dir="rtl"
        className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="px-5 py-3 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
          <SheetTitle className="font-display text-[18px] text-right flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isNew ? "أصل عالمي جديد" : asset?.name}
          </SheetTitle>
          {asset && (
            <p className="text-[11px] text-foreground-tertiary text-right">
              {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type} · رقم الأصل {asset.id.slice(0, 8)}
            </p>
          )}
        </SheetHeader>

        <Tabs defaultValue={isNew ? "genesis" : "basic"} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-4 h-10">
            <TabsTrigger value="basic" className="text-[12px]">أساسي</TabsTrigger>
            <TabsTrigger value="financials" className="text-[12px]">العقود المالية</TabsTrigger>
            <TabsTrigger value="inventory" className="text-[12px]">المخزون</TabsTrigger>
            <TabsTrigger value="genesis" className="text-[12px] gap-1 inline-flex items-center justify-center">
              <Sparkles className="h-3 w-3" /> التكوين الذكي
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <TabsContent value="basic" className="m-0">
              {asset ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border/40 bg-card p-4">
                    <p className="text-[10px] font-bold text-foreground-tertiary mb-1">الاسم</p>
                    <p className="font-extrabold text-[15px]">{asset.name}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card p-4">
                    <p className="text-[10px] font-bold text-foreground-tertiary mb-1">الوصف</p>
                    <p className="text-[12.5px] leading-relaxed text-foreground-secondary">
                      {asset.description ?? "—"}
                    </p>
                  </div>
                  <Placeholder icon={Layers} title="تحرير الأصل" hint="حقول الاسم/الوصف/السمات قابلة للتحرير في الجزء الخامس عبر RPC update_universal_asset." />
                </div>
              ) : (
                <Placeholder icon={Sparkles} title="ابدأ من التكوين الذكي" hint="استخدم تبويب التكوين الذكي لإنشاء أصل جديد بالصورة." />
              )}
            </TabsContent>

            <TabsContent value="financials" className="m-0">
              {asset && asset.base_price != null && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-3">
                  <p className="text-[10px] font-bold text-foreground-tertiary mb-1">العقد الحالي</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] text-foreground-secondary">{asset.pricing_model ?? "flat"}</span>
                    <span className="font-display text-[20px] num text-primary">
                      {asset.base_price.toLocaleString("ar-EG")} {asset.currency ?? "EGP"}
                    </span>
                  </div>
                </div>
              )}
              <Placeholder icon={Wallet} title="إدارة العقود المالية" hint="تسعير ثابت، أسعار جملة متدرجة، اشتراكات، ودائع وإيجار، أقساط بمراحل." />
            </TabsContent>

            <TabsContent value="inventory" className="m-0">
              <Placeholder icon={Boxes} title="مصفوفة المخزون متعدد الأبعاد" hint="عدّ مخزون، فترات زمنية، أو طاقة استيعابية حسب الموقع." />
            </TabsContent>

            <TabsContent value="genesis" className="m-0">
              <VisionGenesisUploader onApprove={() => onClose()} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="bg-background/95 backdrop-blur border-t border-border/40 px-5 py-3 flex gap-2">
          <button onClick={onClose} className="flex-1 h-12 rounded-2xl bg-surface-muted text-[14px] font-semibold press">
            إغلاق
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
