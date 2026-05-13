/**
 * Phase V-1.C — Vision Genesis Route.
 *
 * Full-screen, mobile-first AI-first product creation flow.
 * Replaces the cramped Dialog-based SmartProductComposer.
 *
 * Sections:
 *  1. Capture Zone — dual gallery / camera buttons (no `capture=environment`).
 *  2. Hakim Draft Board — structured DNA view (Identity, Financial,
 *     Nutrition, Marketing) with subtle AI rings, every field editable.
 *  3. Human Veto Bar — sticky footer: إلغاء · تعديل · اعتماد ونشر.
 *
 * Article 8.1 (Human Veto) — nothing is minted without explicit click.
 * Article 12.2 (Vision Cortex) — DNA extraction via vision_genesis.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  ArrowRight, Brain, Camera, CheckCircle2, ImagePlus, Loader2,
  Sparkles, UploadCloud, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAestheticProcessor } from "@/core-os/hakim-ai/hooks/useAestheticProcessor";
import {
  useVisionGenesis, type USAGenesisPayload,
} from "@/core-os/hakim-ai/hooks/useVisionGenesis";
import { useMintUSA } from "@/core-os/hakim-ai/hooks/useMintUSA";

export const Route = createFileRoute("/admin/assets/genesis")({
  component: GenesisPage,
});

type Stage = "idle" | "cleaning" | "describing" | "publishing" | "done";

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

// Optional rich-DNA fields the upgraded Vision Cortex may emit on `asset`.
type RichDNA = {
  category_path?: string;
  brand?: string;
  origin_country?: string;
  marketing?: { short?: string; long?: string };
  nutrition?: {
    kcal?: number; protein_g?: number; fat_g?: number;
    carbs_g?: number; sugar_g?: number;
  };
  physical?: { net_weight?: number; weight_unit?: string };
  allergens?: string[];
};

function GenesisPage() {
  const navigate = useNavigate();
  const aesthetic = useAestheticProcessor();
  const vision = useVisionGenesis();
  const mint = useMintUSA();

  const [stage, setStage] = useState<Stage>("idle");
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(null);
  const [genesis, setGenesis] = useState<USAGenesisPayload | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Granular DNA form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [origin, setOrigin] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("EGP");
  const [marketingShort, setMarketingShort] = useState("");
  const [marketingLong, setMarketingLong] = useState("");
  const [kcal, setKcal] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [sugar, setSugar] = useState<number | "">("");
  const [netWeight, setNetWeight] = useState<number | "">("");
  const [weightUnit, setWeightUnit] = useState("g");
  const [approxWeight, setApproxWeight] = useState(false);
  const [allergens, setAllergens] = useState("");
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const clearAi = (k: string) =>
    setAiFields((s) => { if (!s.has(k)) return s; const n = new Set(s); n.delete(k); return n; });

  const onPickFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط"); return; }
    setPrimaryFile(file);
    setPrimaryUrl(URL.createObjectURL(file));
  }, []);

  async function runClean() {
    if (!primaryFile) return;
    try {
      setStage("cleaning");
      const cleaned = await aesthetic.mutateAsync({ file: primaryFile, style: "white" });
      setPrimaryUrl(cleaned.imageDataUrl);
      setPrimaryFile(dataUrlToFile(cleaned.imageDataUrl));
      toast.success("تم تحسين الصورة");
    } catch { toast.error("فشل تحسين الصورة"); }
    finally { setStage("idle"); }
  }

  async function runAnalyze() {
    if (!primaryFile) { toast.error("أضف صورة أولًا"); return; }
    try {
      setStage("describing");
      const usa = await vision.mutateAsync({ file: primaryFile });
      setGenesis(usa);
      // Phase V-2: server returned a generative pastel composition — adopt it.
      const aestheticUrl = (usa as unknown as { aesthetic_image_data_url?: string | null })
        .aesthetic_image_data_url;
      if (aestheticUrl && aestheticUrl.startsWith("data:image/")) {
        setPrimaryUrl(aestheticUrl);
        setPrimaryFile(dataUrlToFile(aestheticUrl));
      }
      const a = usa.asset as USAGenesisPayload["asset"] & RichDNA;
      setName(a.name ?? "");
      setDescription(a.description ?? "");
      setCategory(a.category_path ?? a.asset_type ?? "");
      setBrand(a.brand ?? "");
      setOrigin(a.origin_country ?? "");
      setMarketingShort(a.marketing?.short ?? "");
      setMarketingLong(a.marketing?.long ?? "");
      setKcal(a.nutrition?.kcal ?? "");
      setProtein(a.nutrition?.protein_g ?? "");
      setFat(a.nutrition?.fat_g ?? "");
      setCarbs(a.nutrition?.carbs_g ?? "");
      setSugar(a.nutrition?.sugar_g ?? "");
      setNetWeight(a.physical?.net_weight ?? "");
      setWeightUnit(a.physical?.weight_unit ?? "g");
      setAllergens((a.allergens ?? []).join(", "));
      const fp = fairTick(usa.financial_contract.base_price);
      setPrice(fp);
      setCost(Number((fp * 0.6).toFixed(2)));
      setCurrency(usa.financial_contract.currency ?? "EGP");
      setAiFields(new Set([
        "name", "description", "category", "brand", "origin",
        "marketingShort", "marketingLong", "price", "cost",
        "kcal", "protein", "fat", "carbs", "sugar",
        "netWeight", "allergens",
      ]));
      toast.success("استخرج حكيم البيانات — راجع واعتمد");
    } catch (err) {
      console.error("[Genesis] analyze error", err);
      toast.error("فشل تحليل الصورة");
    } finally { setStage("idle"); }
  }

  async function approve() {
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
          currency: currency as "EGP" | "USD" | "EUR",
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
        financial_contract: {
          ...base.financial_contract,
          base_price: price,
          currency: currency as "EGP" | "USD" | "EUR",
        },
      });
      setStage("done");
      toast.success("تم سكّ الأصل بنجاح");
      setTimeout(() => navigate({ to: "/admin/assets" }), 800);
    } catch (err) {
      console.error("[Genesis] mint error", err);
      toast.error("فشل النشر");
      setStage("idle");
    }
  }

  const cleaning = stage === "cleaning";
  const describing = stage === "describing";
  const publishing = stage === "publishing";
  const done = stage === "done";
  const busy = cleaning || describing || publishing;
  const hasDraft = genesis !== null;

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border/50">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/admin/assets" })}
            className="h-10 w-10 rounded-xl hover:bg-surface-muted flex items-center justify-center press"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="font-display text-[16px] leading-tight flex items-center gap-1.5 justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
              تكوين أصل جديد
            </h1>
            <p className="text-[11px] text-foreground-tertiary">
              أنت السيد — حكيم يستخرج، وأنت تعتمد
            </p>
          </div>
          <span className="w-10" />
        </div>
      </header>

      {/* Body — generous padding bottom for sticky veto bar */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 pb-40 space-y-6">
        {/* 1. Capture Zone */}
        <section className="space-y-3">
          <SectionTitle index="١" label="التقاط الصورة" />
          <CaptureZone
            url={primaryUrl}
            busy={busy}
            busyLabel={cleaning ? "جاري التحسين…" : describing ? "جاري التحليل…" : ""}
            onFile={onPickFile}
            onClear={() => { setPrimaryFile(null); setPrimaryUrl(null); setGenesis(null); }}
          />
          {primaryFile && !hasDraft && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button" disabled={busy} onClick={runClean}
                className={cn(
                  "h-12 rounded-2xl text-[12.5px] font-semibold press transition-base",
                  "bg-foreground/5 hover:bg-foreground/10 border border-border/50",
                  "flex items-center justify-center gap-2 disabled:opacity-40",
                )}
              >
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                ✨ تنظيف
              </button>
              <button
                type="button" disabled={busy} onClick={runAnalyze}
                className={cn(
                  "h-12 rounded-2xl text-[13px] font-semibold press transition-base",
                  "bg-gradient-primary text-primary-foreground shadow-glow",
                  "flex items-center justify-center gap-2 disabled:opacity-40",
                )}
              >
                {describing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                🤖 استخراج DNA
              </button>
            </div>
          )}
        </section>

        {/* 2. Hakim Draft Board */}
        {(hasDraft || editMode) && (
          <section className="space-y-4">
            <SectionTitle index="٢" label="لوحة حكيم" hint="حقول الهالة من حكيم — حررها بحرية" />

            <DnaGroup title="الهوية">
              <DnaField label="الاسم" ai={aiFields.has("name")}>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearAi("name"); }}
                  className="w-full bg-transparent outline-none text-[15px] font-display"
                />
              </DnaField>
              <DnaField label="الوصف" ai={aiFields.has("description")}>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearAi("description"); }}
                  rows={2}
                  className="w-full bg-transparent outline-none text-[13px] resize-none"
                />
              </DnaField>
              <div className="grid grid-cols-2 gap-2">
                <DnaField label="التصنيف" ai={aiFields.has("category")}>
                  <input
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); clearAi("category"); }}
                    className="w-full bg-transparent outline-none text-[12.5px]"
                  />
                </DnaField>
                <DnaField label="الماركة" ai={aiFields.has("brand")}>
                  <input
                    value={brand}
                    onChange={(e) => { setBrand(e.target.value); clearAi("brand"); }}
                    className="w-full bg-transparent outline-none text-[12.5px]"
                  />
                </DnaField>
              </div>
              <DnaField label="بلد المنشأ" ai={aiFields.has("origin")}>
                <input
                  value={origin}
                  onChange={(e) => { setOrigin(e.target.value); clearAi("origin"); }}
                  className="w-full bg-transparent outline-none text-[12.5px]"
                />
              </DnaField>
            </DnaGroup>

            <DnaGroup title="المالية">
              <div className="grid grid-cols-2 gap-2">
                <DnaField label="السعر" ai={aiFields.has("price")}>
                  <input
                    type="number" step="0.01" value={price}
                    onChange={(e) => { setPrice(Number(e.target.value)); clearAi("price"); }}
                    className="w-full bg-transparent outline-none text-[14px] font-display"
                  />
                </DnaField>
                <DnaField label="التكلفة" ai={aiFields.has("cost")}>
                  <input
                    type="number" step="0.01" value={cost}
                    onChange={(e) => { setCost(Number(e.target.value)); clearAi("cost"); }}
                    className="w-full bg-transparent outline-none text-[14px]"
                  />
                </DnaField>
              </div>
              <DnaField label="العملة">
                <select
                  value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-transparent outline-none text-[13px]"
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </DnaField>
            </DnaGroup>

            <DnaGroup title="التغذية" hint="لكل 100جم">
              <div className="grid grid-cols-2 gap-2">
                <DnaField label="سعرات حرارية" ai={aiFields.has("kcal")}>
                  <NumInput value={kcal} onChange={(v) => { setKcal(v); clearAi("kcal"); }} />
                </DnaField>
                <DnaField label="بروتين (جم)" ai={aiFields.has("protein")}>
                  <NumInput value={protein} onChange={(v) => { setProtein(v); clearAi("protein"); }} />
                </DnaField>
                <DnaField label="دهون (جم)" ai={aiFields.has("fat")}>
                  <NumInput value={fat} onChange={(v) => { setFat(v); clearAi("fat"); }} />
                </DnaField>
                <DnaField label="كربوهيدرات (جم)" ai={aiFields.has("carbs")}>
                  <NumInput value={carbs} onChange={(v) => { setCarbs(v); clearAi("carbs"); }} />
                </DnaField>
                <DnaField label="سكر (جم)" ai={aiFields.has("sugar")}>
                  <NumInput value={sugar} onChange={(v) => { setSugar(v); clearAi("sugar"); }} />
                </DnaField>
                <DnaField label="الوزن الصافي" ai={aiFields.has("netWeight")}>
                  <div className="flex items-center gap-1">
                    <NumInput value={netWeight} onChange={(v) => { setNetWeight(v); clearAi("netWeight"); }} />
                    <select
                      value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}
                      className="bg-transparent outline-none text-[11px] text-foreground-tertiary"
                    >
                      <option value="g">جم</option>
                      <option value="kg">كجم</option>
                      <option value="ml">مل</option>
                      <option value="l">لتر</option>
                    </select>
                  </div>
                </DnaField>
              </div>
              <DnaField label="مسببات الحساسية" ai={aiFields.has("allergens")}>
                <input
                  value={allergens}
                  onChange={(e) => { setAllergens(e.target.value); clearAi("allergens"); }}
                  placeholder="جلوتين، حليب، مكسرات…"
                  className="w-full bg-transparent outline-none text-[12.5px]"
                />
              </DnaField>
            </DnaGroup>

            <DnaGroup title="التسويق">
              <DnaField label="عبارة قصيرة" ai={aiFields.has("marketingShort")}>
                <input
                  value={marketingShort}
                  onChange={(e) => { setMarketingShort(e.target.value); clearAi("marketingShort"); }}
                  className="w-full bg-transparent outline-none text-[13px]"
                />
              </DnaField>
              <DnaField label="وصف تسويقي" ai={aiFields.has("marketingLong")}>
                <textarea
                  value={marketingLong}
                  onChange={(e) => { setMarketingLong(e.target.value); clearAi("marketingLong"); }}
                  rows={3}
                  className="w-full bg-transparent outline-none text-[12.5px] resize-none"
                />
              </DnaField>
            </DnaGroup>

            {genesis?.asset.traits?.length ? (
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary mb-1.5">
                  سمات مكتشفة
                </p>
                <div className="flex flex-wrap gap-1">
                  {genesis.asset.traits.slice(0, 12).map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-card border border-border/40 text-foreground-secondary">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </main>

      {/* 3. Human Veto Sticky Bar */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border/60 shadow-float">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate({ to: "/admin/assets" })}
              disabled={busy}
              className="h-12 px-4 rounded-2xl text-[12.5px] font-semibold press hover:bg-surface-muted disabled:opacity-40"
            >
              إلغاء
            </button>
            <button
              onClick={() => setEditMode(true)}
              disabled={busy || (!hasDraft && !primaryFile)}
              className={cn(
                "h-12 px-4 rounded-2xl text-[12.5px] font-semibold press",
                "bg-foreground/5 hover:bg-foreground/10 border border-border/50",
                "disabled:opacity-40",
              )}
            >
              تعديل
            </button>
            <button
              onClick={approve}
              disabled={busy || done || !name.trim() || price <= 0}
              className={cn(
                "flex-1 h-12 rounded-2xl font-display text-[14px]",
                "bg-gradient-primary text-primary-foreground shadow-glow press transition-base",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
              )}
            >
              {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
              {done ? <CheckCircle2 className="h-4 w-4" /> : null}
              {done ? "تم الاعتماد" : "اعتماد ونشر"}
            </button>
          </div>
          {!hasDraft && (
            <p className="text-[10.5px] text-foreground-tertiary text-center mt-2">
              لن يُسكّ شيء بدون أمرك · المادة 8.1 — حق النقض البشري
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ===================== sub-components ===================== */

function SectionTitle({ index, label, hint }: { index: string; label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-display flex items-center justify-center shrink-0">
        {index}
      </span>
      <h2 className="font-display text-[14.5px] leading-tight">{label}</h2>
      {hint && <span className="text-[10.5px] text-foreground-tertiary">· {hint}</span>}
    </div>
  );
}

function CaptureZone({
  url, busy, busyLabel, onFile, onClear,
}: {
  url: string | null; busy: boolean; busyLabel: string;
  onFile: (file: File | null | undefined) => void; onClear: () => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className={cn(
        "relative rounded-3xl border-2 border-dashed bg-card overflow-hidden",
        "aspect-square flex items-center justify-center",
        url ? "border-primary/40" : "border-border/60",
      )}>
        {url ? (
          <img src={url} alt="معاينة" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div className="text-center px-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="font-display text-[14px]">أضف صورة المنتج</p>
            <p className="text-[11px] text-foreground-tertiary mt-1">
              من المعرض أو بالكاميرا — حكيم سيستخرج DNA كامل
            </p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
            <p className="text-[12.5px] font-semibold">{busyLabel}</p>
          </div>
        )}
        {url && !busy && (
          <button
            onClick={onClear}
            className="absolute top-2 left-2 h-9 w-9 rounded-full bg-card/95 border border-border/60 flex items-center justify-center press"
            aria-label="حذف"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!url && (
        <div className="grid grid-cols-2 gap-2">
          <input
            ref={galleryRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button" onClick={() => galleryRef.current?.click()}
            className="h-12 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[12.5px] font-semibold press flex items-center justify-center gap-2"
          >
            <ImagePlus className="h-4 w-4" /> من المعرض
          </button>
          <button
            type="button" onClick={() => cameraRef.current?.click()}
            className="h-12 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[12.5px] font-semibold press flex items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" /> الكاميرا
          </button>
        </div>
      )}
    </div>
  );
}

function DnaGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-1.5">
        <p className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary font-semibold">
          {title}
        </p>
        {hint && <span className="text-[10px] text-foreground-tertiary">· {hint}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DnaField({
  label, ai, children,
}: { label: string; ai?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn(
      "block rounded-xl bg-surface-muted/50 border border-border/40 px-3 py-2",
      "focus-within:ring-2 focus-within:ring-primary/40 focus-within:bg-card transition",
      ai && "ring-2 ring-primary/30 bg-card",
    )}>
      <span className="block text-[10px] uppercase tracking-wider text-foreground-tertiary mb-0.5">
        {label}
        {ai && <span className="ms-1.5 text-primary normal-case tracking-normal">· حكيم</span>}
      </span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) {
  return (
    <input
      type="number" step="0.1"
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="w-full bg-transparent outline-none text-[13px] font-display"
    />
  );
}
