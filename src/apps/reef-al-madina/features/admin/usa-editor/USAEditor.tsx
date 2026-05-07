/**
 * USAEditor — Phase 7 Part 5.
 * Slide-over Sheet (RTL, max-w-2xl) for editing a Universal Salsabil Asset.
 * Tabs: أساسي · العقود المالية · المخزون · التكوين الذكي.
 * Basic + Financials are now active forms wired to `update_universal_asset` RPC.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Boxes, Wrench, Loader2, Save } from "lucide-react";
import VisionGenesisUploader from "@/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader";
import { useUpdateUSA } from "@/core-os/hakim-ai/hooks/useUpdateUSA";

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
      الجزء السادس · قريباً
    </span>
  </div>
);

const Field = ({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block">
    <span className="block text-[10.5px] font-bold text-foreground-tertiary mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-[10.5px] text-foreground-tertiary mt-1">{hint}</span>}
  </label>
);

export default function USAEditor({ open, asset, onClose, onSaved }: Props) {
  const isNew = !asset;
  const update = useUpdateUSA();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<string>("");

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description ?? "");
      setBasePrice(asset.base_price != null ? String(asset.base_price) : "");
    } else {
      setName("");
      setDescription("");
      setBasePrice("");
    }
  }, [asset, open]);

  const handleSave = async () => {
    if (!asset) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const priceNum = basePrice.trim() === "" ? null : Number(basePrice);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) return;
    try {
      await update.mutateAsync({
        asset_id: asset.id,
        name: trimmed,
        description: description.trim() || null,
        base_price: priceNum,
      });
      onSaved?.();
    } catch {
      /* toast handled in hook */
    }
  };

  const SaveButton = ({ disabled }: { disabled?: boolean }) => (
    <button
      type="button"
      onClick={handleSave}
      disabled={disabled || update.isPending || !name.trim()}
      className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {update.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري الحفظ والتزامن…
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          حفظ التعديلات
        </>
      )}
    </button>
  );

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
            <TabsContent value="basic" className="m-0 space-y-4">
              {asset ? (
                <>
                  <Field label="اسم الأصل">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: زيت زيتون عضوي 1 لتر"
                      className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[13.5px] outline-none focus:border-primary"
                    />
                  </Field>
                  <Field label="الوصف" hint="ظاهر للعملاء في المتجر وفي مزامنة المنتجات القديمة.">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="وصف مفصّل للأصل…"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary resize-none"
                    />
                  </Field>
                  <SaveButton />
                </>
              ) : (
                <Placeholder icon={Sparkles} title="ابدأ من التكوين الذكي" hint="استخدم تبويب التكوين الذكي لإنشاء أصل جديد بالصورة." />
              )}
            </TabsContent>

            <TabsContent value="financials" className="m-0 space-y-4">
              {asset ? (
                <>
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10.5px] font-bold text-foreground-tertiary">نموذج التسعير</span>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {asset.pricing_model ?? "flat"}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-tertiary">
                      يعدّل هذا السعر العقد النشط الأول ويزامن صف المنتج القديم تلقائياً.
                    </p>
                  </div>
                  <Field label={`السعر الأساسي (${asset.currency ?? "EGP"})`}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 rounded-xl border border-border bg-background px-3 text-[14px] num font-semibold outline-none focus:border-primary text-left"
                      dir="ltr"
                    />
                  </Field>
                  <SaveButton />
                </>
              ) : (
                <Placeholder icon={Wrench} title="إدارة العقود المالية" hint="ابدأ بإنشاء أصل من تبويب التكوين الذكي ثم عدّل سعره هنا." />
              )}
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
