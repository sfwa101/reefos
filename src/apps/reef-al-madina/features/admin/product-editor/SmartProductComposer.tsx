/**
 * SmartProductComposer — Phase 66.2 "Product Cortex".
 *
 * One-tap product creation. The user drops an image; Hakim runs:
 *   1) Aesthetic processor (clean background → white)
 *   2) Vision Genesis (name_ar, description, asset_type, traits, base_price)
 *   3) Predictive Pricing (rounds Hakim's base_price to a fair retail tick)
 * Then we show a "Confirmation Surface" — text fields pre-filled with
 * Hakim's predictions, editable only if needed. Single CTA: تأكيد ونشر.
 *
 * Persistence uses the existing `mint_universal_asset` RPC via `useMintUSA`.
 *
 * Zero manual data entry where Hakim can predict.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera, CheckCircle2, ImagePlus, Loader2, Sparkles, UploadCloud, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAestheticProcessor } from "@/core-os/hakim-ai/hooks/useAestheticProcessor";
import {
  useVisionGenesis,
  type USAGenesisPayload,
} from "@/core-os/hakim-ai/hooks/useVisionGenesis";
import { useMintUSA } from "@/core-os/hakim-ai/hooks/useMintUSA";

type Stage =
  | "idle"
  | "cleaning"
  | "describing"
  | "pricing"
  | "ready"
  | "publishing"
  | "done";

const STAGE_LABEL: Record<Exclude<Stage, "idle" | "ready" | "done">, string> = {
  cleaning:   "جاري إزالة الخلفية…",
  describing: "حكيم يكتب الوصف…",
  pricing:    "حساب التسعير العادل…",
  publishing: "جاري النشر…",
};

/** Round to a "fair" retail tick: nearest 5 EGP, ceiling, with .99 polish above 50. */
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

export function SmartProductComposer() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const aesthetic = useAestheticProcessor();
  const vision    = useVisionGenesis();
  const mint      = useMintUSA();

  const [stage, setStage] = useState<Stage>("idle");
  const [cleanUrl, setCleanUrl] = useState<string | null>(null);
  const [genesis, setGenesis] = useState<USAGenesisPayload | null>(null);

  // Editable confirmation surface (pre-filled with Hakim's values).
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);

  const reset = useCallback(() => {
    setStage("idle");
    setCleanUrl(null);
    setGenesis(null);
    setName(""); setDescription(""); setPrice(0);
  }, []);

  /** The full Hakim pipeline. */
  const runPipeline = useCallback(async (file: File) => {
    try {
      // 1) Clean background
      setStage("cleaning");
      const cleaned = await aesthetic.mutateAsync({ file, style: "white" });
      setCleanUrl(cleaned.imageDataUrl);

      // 2) Describe
      setStage("describing");
      const cleanFile = dataUrlToFile(cleaned.imageDataUrl);
      const usa = await vision.mutateAsync({ file: cleanFile });
      setGenesis(usa);
      setName(usa.asset.name);
      setDescription(usa.asset.description);

      // 3) Price
      setStage("pricing");
      await new Promise((r) => setTimeout(r, 350)); // brief beat — visual cadence
      setPrice(fairTick(usa.financial_contract.base_price));

      setStage("ready");
    } catch (err) {
      toast.error("فشل تحليل الصورة. حاول بصورة أوضح.");
      console.error("[SmartProductComposer] pipeline error", err);
      setStage("idle");
    }
  }, [aesthetic, vision]);

  const onFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة فقط");
      return;
    }
    void runPipeline(file);
  }, [runPipeline]);

  // Drag & drop wiring
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => {
    const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  async function publish() {
    if (!genesis) return;
    setStage("publishing");
    try {
      await mint.mutateAsync({
        asset: {
          ...genesis.asset,
          name,
          description,
          media: cleanUrl ? [cleanUrl] : genesis.asset.media,
        },
        skus: genesis.skus,
        financial_contract: {
          ...genesis.financial_contract,
          base_price: price,
        },
      });
      setStage("done");
      setTimeout(() => navigate({ to: "/admin/product-units" }), 1100);
    } catch (err) {
      console.error("[SmartProductComposer] mint error", err);
      setStage("ready");
    }
  }

  const busy = stage !== "idle" && stage !== "ready" && stage !== "done";

  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-4 lg:p-8 space-y-6">
      <header className="space-y-1.5">
        <h1 className="font-display text-[26px] leading-tight">منتج جديد بنقرة واحدة</h1>
        <p className="text-[13px] text-foreground-secondary">
          أسقِط صورة المنتج — وحكيم يكتب الاسم والوصف ويقترح السعر.
        </p>
      </header>

      {/* DROP ZONE */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !busy && stage === "idle" && inputRef.current?.click()}
        className={cn(
          "relative rounded-3xl border-2 border-dashed transition-base overflow-hidden",
          "min-h-[280px] lg:min-h-[360px] flex items-center justify-center text-center p-6",
          "bg-gradient-to-br from-surface-muted/40 to-card",
          dragOver ? "border-primary bg-primary/5 shadow-glow"
                   : "border-border/60 hover:border-primary/50",
          stage === "idle" && "cursor-pointer press",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {cleanUrl ? (
          <img
            src={cleanUrl}
            alt="معاينة المنتج"
            className="absolute inset-0 w-full h-full object-contain bg-card"
          />
        ) : stage === "idle" ? (
          <div className="space-y-3">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-[18px]">أسقِط صورة المنتج هنا</p>
              <p className="text-[12.5px] text-foreground-tertiary mt-1">
                أو انقر للاختيار من الجهاز
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-foreground text-background text-[12px] font-semibold press"
              >
                <ImagePlus className="h-4 w-4" /> اختر صورة
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] text-foreground-tertiary">
                <Camera className="h-3.5 w-3.5" /> أو الكاميرا على الجوال
              </span>
            </div>
          </div>
        ) : null}

        {/* Pipeline overlay */}
        {busy && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[14px] font-semibold">{STAGE_LABEL[stage as keyof typeof STAGE_LABEL]}</p>
            <PipelineSteps stage={stage} />
          </div>
        )}

        {stage === "ready" && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="absolute top-3 left-3 h-8 w-8 rounded-full bg-card/95 border border-border/60 flex items-center justify-center press"
            aria-label="ابدأ من جديد"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* CONFIRMATION SURFACE */}
      {(stage === "ready" || stage === "publishing" || stage === "done") && genesis && (
        <section className="rounded-3xl border border-border/50 bg-card shadow-soft p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-[12px] font-semibold text-primary">قراءة حكيم — عدّل فقط ما يلزم</p>
          </div>

          <Field label="اسم المنتج">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none text-[16px] font-display"
            />
          </Field>

          <Field label="الوصف">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-transparent outline-none text-[13.5px] leading-relaxed resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`السعر (${genesis.financial_contract.currency})`}>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full bg-transparent outline-none text-[16px] font-display"
              />
            </Field>
            <Field label="النوع">
              <p className="text-[14px] font-semibold">{genesis.asset.asset_type}</p>
            </Field>
          </div>

          {genesis.asset.traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genesis.asset.traits.slice(0, 8).map((t) => (
                <span key={t} className="text-[10.5px] px-2 py-0.5 rounded-full bg-surface-muted text-foreground-secondary">
                  {t}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={publish}
            disabled={busy || stage === "done" || !name.trim() || price <= 0}
            className={cn(
              "w-full h-12 rounded-2xl font-display text-[15px]",
              "bg-gradient-primary text-primary-foreground shadow-glow press transition-base",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2",
            )}
          >
            {stage === "publishing" && <Loader2 className="h-4 w-4 animate-spin" />}
            {stage === "done" && <CheckCircle2 className="h-5 w-5" />}
            {stage === "done" ? "تم النشر" : "تأكيد ونشر"}
          </button>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-surface-muted/50 border border-border/40 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:bg-card transition">
      <span className="block text-[10.5px] uppercase tracking-wider text-foreground-tertiary mb-0.5">{label}</span>
      {children}
    </label>
  );
}

function PipelineSteps({ stage }: { stage: Stage }) {
  const steps: Array<{ key: Stage; label: string }> = [
    { key: "cleaning",   label: "تنقية" },
    { key: "describing", label: "وصف" },
    { key: "pricing",    label: "تسعير" },
  ];
  const order: Stage[] = ["cleaning", "describing", "pricing", "ready"];
  const idx = order.indexOf(stage);
  return (
    <ol className="flex items-center gap-2 text-[11px] text-foreground-tertiary">
      {steps.map((s, i) => {
        const done = order.indexOf(s.key) < idx;
        const active = s.key === stage;
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={cn(
              "h-1.5 w-6 rounded-full transition-base",
              done ? "bg-primary" : active ? "bg-primary/60 animate-pulse" : "bg-border",
            )} />
            <span className={cn(active && "text-foreground font-semibold")}>{s.label}</span>
            {i < steps.length - 1 && <span className="opacity-40">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default SmartProductComposer;
