/**
 * SmartProductComposer — Phase 66.2 "Sovereign Product Cortex".
 *
 * The Command Modal: a 90vw × 90vh Dialog preserving page context.
 * Split view:
 *   - LEFT (30%): Multimedia Hub — primary drop zone + secondary slots
 *     (label, barcode). Two opt-in buttons control AI:
 *       ✨ تنظيف وتحسين الصورة → useAestheticProcessor
 *       🤖 تحليل واستخراج البيانات → useVisionGenesis
 *   - RIGHT (70%): Granular Control Surface — every field is human-editable.
 *     AI-filled fields wear a subtle ring-primary/30 cue, cleared on edit.
 *
 * The Human Veto rules: nothing runs without an explicit click.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, CheckCircle2, ImagePlus, Loader2, Sparkles, UploadCloud, X,
  Wand2, Brain, Tags, Barcode, FileImage,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAestheticProcessor } from "@/core/hakim-ai/hooks/useAestheticProcessor";
import {
  useVisionGenesis,
  type USAGenesisPayload,
} from "@/core/hakim-ai/hooks/useVisionGenesis";
import { useMintUSA } from "@/core/hakim-ai/hooks/useMintUSA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = "idle" | "cleaning" | "describing" | "publishing" | "done";

/** Round to a "fair" retail tick. */
function fairTick(value: number): number {
  if (!value || value <= 0) return 0;
  if (value < 50) return Math.max(1, Math.round(value));
  const r = Math.ceil(value / 5) * 5;
  return r >= 50 ? r - 0.01 : r;
}

function dataUrlToFile(dataUrl: string, name = "clean.png"): File {
  const [header, b64] = dataUrl.split(",");
  const mime = /data:(.+);base64/.exec(header ?? "")?.[1] ?? "image/png";
  const bin = atob(b64 ?? "");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}

type AIField =
  | "name" | "description" | "category" | "cost" | "price"
  | "discount" | "taxCode" | "sku" | "barcode" | "weight" | "dimensions";

export interface SmartProductComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function SmartProductComposer({ open, onOpenChange, onPublished }: SmartProductComposerProps) {
  const aesthetic = useAestheticProcessor();
  const vision    = useVisionGenesis();
  const mint      = useMintUSA();

  const [stage, setStage] = useState<Stage>("idle");

  // Multimedia Hub
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);

  // Genesis snapshot (from Vision)
  const [genesis, setGenesis] = useState<USAGenesisPayload | null>(null);

  // Granular form state
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("");
  const [cost, setCost]               = useState<number>(0);
  const [price, setPrice]             = useState<number>(0);
  const [discount, setDiscount]       = useState<number>(0);
  const [taxCode, setTaxCode]         = useState("VAT_14");
  const [sku, setSku]                 = useState("");
  const [barcode, setBarcode]         = useState("");
  const [weight, setWeight]           = useState<number>(0);
  const [dimensions, setDimensions]   = useState("");

  // Track fields filled by AI; cleared when user edits.
  const [aiFilled, setAiFilled] = useState<Set<AIField>>(new Set());
  const markAI = (keys: AIField[]) => setAiFilled(new Set(keys));
  const clearAI = (k: AIField) => setAiFilled((prev) => {
    if (!prev.has(k)) return prev;
    const next = new Set(prev); next.delete(k); return next;
  });

  const reset = useCallback(() => {
    setStage("idle");
    setPrimaryFile(null); setPrimaryUrl(null);
    setLabelUrl(null); setBarcodeUrl(null);
    setGenesis(null);
    setName(""); setDescription(""); setCategory("");
    setCost(0); setPrice(0); setDiscount(0); setTaxCode("VAT_14");
    setSku(""); setBarcode(""); setWeight(0); setDimensions("");
    setAiFilled(new Set());
  }, []);

  // Reset when the dialog closes.
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const onPickFile = useCallback(
    (slot: "primary" | "label" | "barcode") =>
      (file: File | null | undefined) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط"); return; }
        const url = URL.createObjectURL(file);
        if (slot === "primary") { setPrimaryFile(file); setPrimaryUrl(url); }
        if (slot === "label")   setLabelUrl(url);
        if (slot === "barcode") setBarcodeUrl(url);
      },
    [],
  );

  /** OPT-IN: aesthetic clean. */
  async function runClean() {
    if (!primaryFile) { toast.error("أضف صورة أولًا"); return; }
    try {
      setStage("cleaning");
      const cleaned = await aesthetic.mutateAsync({ file: primaryFile, style: "white" });
      setPrimaryUrl(cleaned.imageDataUrl);
      setPrimaryFile(dataUrlToFile(cleaned.imageDataUrl));
      toast.success("تم تحسين الصورة");
    } catch (err) {
      console.error("[Composer] clean error", err);
      toast.error("فشل تحسين الصورة");
    } finally {
      setStage("idle");
    }
  }

  /** OPT-IN: Vision Genesis — fills fields with subtle AI ring. */
  async function runAnalyze() {
    if (!primaryFile) { toast.error("أضف صورة أولًا"); return; }
    try {
      setStage("describing");
      const usa = await vision.mutateAsync({ file: primaryFile });
      setGenesis(usa);
      setName(usa.asset.name);
      setDescription(usa.asset.description);
      setCategory(usa.asset.asset_type);
      const fairPrice = fairTick(usa.financial_contract.base_price);
      setPrice(fairPrice);
      setCost(Number((fairPrice * 0.6).toFixed(2)));
      markAI(["name", "description", "category", "price", "cost"]);
      toast.success("تم استخراج البيانات");
    } catch (err) {
      console.error("[Composer] analyze error", err);
      toast.error("فشل تحليل الصورة");
    } finally {
      setStage("idle");
    }
  }

  async function publish() {
    if (!name.trim() || price <= 0) { toast.error("الاسم والسعر مطلوبان"); return; }
    setStage("publishing");
    try {
      const base: USAGenesisPayload = genesis ?? {
        ok: true,
        generated_at: new Date().toISOString(),
        asset: {
          name, description,
          asset_type: "physical",
          traits: [],
          media: primaryUrl ? [primaryUrl] : [],
        },
        skus: [],
        financial_contract: {
          pricing_model: "flat",
          base_price: price,
          currency: "EGP",
          contract_rules: {},
        },
      };
      await mint.mutateAsync({
        asset: {
          ...base.asset,
          name, description,
          media: primaryUrl ? [primaryUrl] : base.asset.media,
        },
        skus: base.skus,
        financial_contract: { ...base.financial_contract, base_price: price },
      });
      setStage("done");
      toast.success("تم نشر المنتج");
      onPublished?.();
      setTimeout(() => onOpenChange(false), 900);
    } catch (err) {
      console.error("[Composer] mint error", err);
      toast.error("فشل النشر");
      setStage("idle");
    }
  }

  const cleaning   = stage === "cleaning";
  const describing = stage === "describing";
  const publishing = stage === "publishing";
  const done       = stage === "done";
  const busy       = cleaning || describing || publishing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-[90vw] w-[90vw] h-[90vh] p-0 overflow-hidden rounded-3xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-display text-[16px] leading-tight">
                منتج جديد — قشرة القيادة
              </DialogTitle>
              <DialogDescription className="text-[11.5px] text-foreground-tertiary leading-tight">
                أنت السيد. حكيم لا يعمل إلا بأمرك.
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 rounded-xl hover:bg-surface-muted flex items-center justify-center press"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Split body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[30%_70%] divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/50 overflow-hidden">
          {/* LEFT — Multimedia Hub */}
          <aside className="overflow-y-auto p-5 space-y-4 bg-surface-muted/30">
            <PrimarySlot
              url={primaryUrl}
              busy={busy}
              busyLabel={cleaning ? "جاري التحسين…" : describing ? "جاري التحليل…" : ""}
              onFile={onPickFile("primary")}
              onClear={() => { setPrimaryFile(null); setPrimaryUrl(null); }}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost"
                type="button"
                disabled={!primaryFile || busy}
                onClick={runClean}
                className={cn(
                  "h-11 rounded-2xl text-[12px] font-semibold press transition-base",
                  "bg-foreground/5 hover:bg-foreground/10 border border-border/50",
                  "flex items-center justify-center gap-1.5",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {cleaning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                ✨ تنظيف
              </Button>
              <Button variant="ghost"
                type="button"
                disabled={!primaryFile || busy}
                onClick={runAnalyze}
                className={cn(
                  "h-11 rounded-2xl text-[12px] font-semibold press transition-base",
                  "bg-gradient-primary text-primary-foreground shadow-glow",
                  "flex items-center justify-center gap-1.5",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {describing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                🤖 تحليل
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <SecondarySlot
                label="ملصق / مكونات"
                icon={FileImage}
                url={labelUrl}
                onFile={onPickFile("label")}
                onClear={() => setLabelUrl(null)}
              />
              <SecondarySlot
                label="باركود"
                icon={Barcode}
                url={barcodeUrl}
                onFile={onPickFile("barcode")}
                onClear={() => setBarcodeUrl(null)}
              />
            </div>

            {genesis?.asset.traits?.length ? (
              <div className="pt-2">
                <p className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary mb-1.5 flex items-center gap-1">
                  <Tags className="h-3 w-3" /> سمات مكتشفة
                </p>
                <div className="flex flex-wrap gap-1">
                  {genesis.asset.traits.slice(0, 10).map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border/40 text-foreground-secondary">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          {/* RIGHT — Granular Control Surface */}
          <section className="overflow-y-auto p-6 space-y-5">
            <FieldGroup title="الأساسيات">
              <Field label="اسم المنتج" ai={aiFilled.has("name")}>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearAI("name"); }}
                  placeholder="مثال: زيت زيتون عضوي 500مل"
                  className="w-full bg-transparent outline-none text-[15px] font-display"
                />
              </Field>
              <Field label="الوصف" ai={aiFilled.has("description")}>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearAI("description"); }}
                  rows={3}
                  placeholder="اكتب وصفًا قصيرًا أو دع حكيم يفعل."
                  className="w-full bg-transparent outline-none text-[13px] leading-relaxed resize-none"
                />
              </Field>
              <Field label="التصنيف" ai={aiFilled.has("category")}>
                <Input
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); clearAI("category"); }}
                  placeholder="غذاء، ملابس، إلكترونيات…"
                  className="w-full bg-transparent outline-none text-[13.5px]"
                />
              </Field>
            </FieldGroup>

            <FieldGroup title="المالية">
              <div className="grid grid-cols-2 gap-3">
                <Field label="التكلفة (ج.م)" ai={aiFilled.has("cost")}>
                  <Input
                    type="number" step="0.01"
                    value={cost}
                    onChange={(e) => { setCost(Number(e.target.value)); clearAI("cost"); }}
                    className="w-full bg-transparent outline-none text-[14px] font-display"
                  />
                </Field>
                <Field label="السعر (ج.م)" ai={aiFilled.has("price")}>
                  <Input
                    type="number" step="0.01"
                    value={price}
                    onChange={(e) => { setPrice(Number(e.target.value)); clearAI("price"); }}
                    className="w-full bg-transparent outline-none text-[14px] font-display"
                  />
                </Field>
                <Field label="خصم (%)" ai={aiFilled.has("discount")}>
                  <Input
                    type="number" step="1" min={0} max={100}
                    value={discount}
                    onChange={(e) => { setDiscount(Number(e.target.value)); clearAI("discount"); }}
                    className="w-full bg-transparent outline-none text-[14px]"
                  />
                </Field>
                <Field label="رمز الضريبة" ai={aiFilled.has("taxCode")}>
                  <Input
                    value={taxCode}
                    onChange={(e) => { setTaxCode(e.target.value); clearAI("taxCode"); }}
                    className="w-full bg-transparent outline-none text-[13px]"
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup title="اللوجستيات">
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" ai={aiFilled.has("sku")}>
                  <Input
                    value={sku}
                    onChange={(e) => { setSku(e.target.value); clearAI("sku"); }}
                    placeholder="auto"
                    className="w-full bg-transparent outline-none text-[13px] font-mono"
                  />
                </Field>
                <Field label="الباركود" ai={aiFilled.has("barcode")}>
                  <Input
                    value={barcode}
                    onChange={(e) => { setBarcode(e.target.value); clearAI("barcode"); }}
                    className="w-full bg-transparent outline-none text-[13px] font-mono"
                  />
                </Field>
                <Field label="الوزن (كجم)" ai={aiFilled.has("weight")}>
                  <Input
                    type="number" step="0.001"
                    value={weight}
                    onChange={(e) => { setWeight(Number(e.target.value)); clearAI("weight"); }}
                    className="w-full bg-transparent outline-none text-[13px]"
                  />
                </Field>
                <Field label="الأبعاد (س×ع×ع)" ai={aiFilled.has("dimensions")}>
                  <Input
                    value={dimensions}
                    onChange={(e) => { setDimensions(e.target.value); clearAI("dimensions"); }}
                    placeholder="20×10×5"
                    className="w-full bg-transparent outline-none text-[13px]"
                  />
                </Field>
              </div>
            </FieldGroup>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/50 shrink-0 bg-surface-muted/30">
          <div className="text-[11.5px] text-foreground-tertiary">
            {aiFilled.size > 0
              ? <>الحقول المُحاطة بهالة <span className="text-primary font-semibold">من حكيم</span> — حررها بحرية.</>
              : <>لن يُلمس شيء بدون أمرك. اضغط <span className="font-semibold">تحليل</span> لتفعيل حكيم.</>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-2xl text-[12.5px] font-semibold press hover:bg-surface-muted"
            >
              إلغاء
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={publish}
              disabled={busy || done || !name.trim() || price <= 0}
              className={cn(
                "h-11 px-6 rounded-2xl font-display text-[14px]",
                "bg-gradient-primary text-primary-foreground shadow-glow press transition-base",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
              )}
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {done && <CheckCircle2 className="h-4 w-4" />}
              {done ? "تم النشر" : "تأكيد ونشر"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== sub-components ===================== */

function PrimarySlot({
  url, busy, busyLabel, onFile, onClear,
}: {
  url: string | null; busy: boolean; busyLabel: string;
  onFile: (file: File | null | undefined) => void; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
      onClick={() => !url && !busy && inputRef.current?.click()}
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-base overflow-hidden",
        "aspect-square flex items-center justify-center text-center p-4 bg-card",
        drag ? "border-primary bg-primary/5 shadow-glow" : "border-border/60 hover:border-primary/50",
        !url && "cursor-pointer press",
      )}
    >
      <input
        ref={inputRef} type="file" accept="image/*"
        className="hidden" onChange={(e) => onFile(e.target.files?.[0])}
      />
      {url ? (
        <img src={url} alt="معاينة المنتج" className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="font-display text-[13.5px] leading-tight">أسقِط الصورة الرئيسية</p>
          <p className="text-[10.5px] text-foreground-tertiary">
            <Camera className="h-3 w-3 inline" /> أو الكاميرا
          </p>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 bg-card/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <p className="text-[12px] font-semibold">{busyLabel}</p>
        </div>
      )}
      {url && !busy && (
        <Button variant="ghost"
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-2 left-2 h-7 w-7 rounded-full bg-card/95 border border-border/60 flex items-center justify-center press"
          aria-label="حذف"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function SecondarySlot({
  label, icon: Icon, url, onFile, onClear,
}: {
  label: string;
  icon: typeof FileImage;
  url: string | null;
  onFile: (file: File | null | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => !url && inputRef.current?.click()}
      className={cn(
        "relative rounded-xl border border-dashed border-border/60 hover:border-primary/50",
        "aspect-[4/3] bg-card flex items-center justify-center overflow-hidden",
        !url && "cursor-pointer press",
      )}
    >
      <input
        ref={inputRef} type="file" accept="image/*"
        className="hidden" onChange={(e) => onFile(e.target.files?.[0])}
      />
      {url ? (
        <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="text-center">
          <Icon className="h-5 w-5 mx-auto text-foreground-tertiary" />
          <p className="text-[10.5px] text-foreground-tertiary mt-1">{label}</p>
          <p className="text-[9.5px] text-foreground-tertiary opacity-70">+ إضافة</p>
        </div>
      )}
      {url && (
        <Button variant="ghost"
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute top-1 left-1 h-6 w-6 rounded-full bg-card/95 border border-border/60 flex items-center justify-center press"
          aria-label="حذف"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary font-semibold">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label, ai, children,
}: { label: string; ai?: boolean; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "block rounded-xl bg-surface-muted/50 border border-border/40 px-3 py-2",
        "focus-within:ring-2 focus-within:ring-primary/40 focus-within:bg-card transition",
        ai && "ring-2 ring-primary/30 bg-card",
      )}
    >
      <span className="block text-[10px] uppercase tracking-wider text-foreground-tertiary mb-0.5">
        {label}
        {ai && <span className="ms-1.5 text-primary normal-case tracking-normal">· حكيم</span>}
      </span>
      {children}
    </label>
  );
}

export default SmartProductComposer;
