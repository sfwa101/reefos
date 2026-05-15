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
import { useAestheticProcessor } from "@/core/hakim-ai/hooks/useAestheticProcessor";
import {
  useVisionGenesis, type USAGenesisPayload,
} from "@/core/hakim-ai/hooks/useVisionGenesis";
import { useMintUSA } from "@/core/hakim-ai/hooks/useMintUSA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

// ── Visual Veto: pastel palette swatches (mirror server `vision_genesis`) ──
type PaletteSwatch = { name: string; hex: string; label: string };
const PALETTES: PaletteSwatch[] = [
  { name: "pure white", hex: "#FFFFFF", label: "أبيض نقي" },
  { name: "mint green", hex: "#D1FAE5", label: "نعناعي" },
  { name: "warm cream", hex: "#FEF3C7", label: "كريمي" },
  { name: "blush pink", hex: "#FCE7F3", label: "وردي" },
  { name: "powder blue", hex: "#DBEAFE", label: "أزرق هادئ" },
  { name: "soft lavender", hex: "#EDE9FE", label: "لافندر" },
  { name: "sand beige", hex: "#F5F1E8", label: "بيج رملي" },
  { name: "sage", hex: "#E2E8DD", label: "ميرمية" },
];

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
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [secondaryUrl, setSecondaryUrl] = useState<string | null>(null);
  const [genesis, setGenesis] = useState<USAGenesisPayload | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<PaletteSwatch | null>(null);

  // Granular DNA form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [origin, setOrigin] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [cost, setCost] = useState<number | "">("");
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

  const priceNum = typeof price === "number" ? price : 0;
  const canApprove = name.trim().length > 0 && priceNum > 0;

  const onPickFile = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط"); return; }
    setPrimaryFile(file);
    setPrimaryUrl(URL.createObjectURL(file));
  }, []);

  const onPickSecondary = useCallback((file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط"); return; }
    setSecondaryFile(file);
    setSecondaryUrl(URL.createObjectURL(file));
  }, []);

  async function runClean(palette?: PaletteSwatch | null) {
    if (!primaryFile) return;
    try {
      setStage("cleaning");
      const target = palette ?? selectedPalette;
      const cleaned = await aesthetic.mutateAsync(
        target
          ? { file: primaryFile, palette: { name: target.name, hex: target.hex } }
          : { file: primaryFile, style: "white" },
      );
      setPrimaryUrl(cleaned.imageDataUrl);
      setPrimaryFile(dataUrlToFile(cleaned.imageDataUrl));
      toast.success("تم تحديث الخلفية");
    } catch { toast.error("فشل تحسين الصورة"); }
    finally { setStage("idle"); }
  }

  async function runAnalyze() {
    if (!primaryFile) { toast.error("أضف صورة أولًا"); return; }
    try {
      setStage("describing");
      const usa = await vision.mutateAsync({ file: primaryFile, secondaryFile });
      setGenesis(usa);
      // Phase V-2: server returned a generative pastel composition — adopt it.
      const extras = usa as unknown as {
        aesthetic_image_data_url?: string | null;
        aesthetic_palette?: { name: string; hex: string } | null;
      };
      if (extras.aesthetic_image_data_url && extras.aesthetic_image_data_url.startsWith("data:image/")) {
        setPrimaryUrl(extras.aesthetic_image_data_url);
        setPrimaryFile(dataUrlToFile(extras.aesthetic_image_data_url));
      }
      if (extras.aesthetic_palette) {
        const matched = PALETTES.find((p) => p.name === extras.aesthetic_palette?.name);
        if (matched) setSelectedPalette(matched);
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
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "فشل تحليل الصورة", { duration: 8000 });
    } finally { setStage("idle"); }
  }

  async function approve() {
    if (!canApprove) { toast.error("الاسم والسعر مطلوبان"); return; }
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
          base_price: priceNum,
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
          base_price: priceNum,
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
          <Button variant="ghost"
            onClick={() => navigate({ to: "/admin/assets" })}
            className="h-10 w-10 rounded-xl hover:bg-surface-muted flex items-center justify-center press"
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
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
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 pb-[260px] space-y-6">
      {/* ↑ pb-[260px] keeps the last DNA field clear of the sticky veto bar AND the AppShell BottomTabBar */}
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
              <Button variant="ghost"
                type="button" disabled={busy} onClick={() => runClean()}
                className={cn(
                  "h-12 rounded-2xl text-[12.5px] font-semibold press transition-base",
                  "bg-foreground/5 hover:bg-foreground/10 border border-border/50",
                  "flex items-center justify-center gap-2 disabled:opacity-40",
                )}
              >
                {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                ✨ تنظيف
              </Button>
              <Button variant="ghost"
                type="button" disabled={busy} onClick={runAnalyze}
                className={cn(
                  "h-12 rounded-2xl text-[13px] font-semibold press transition-base",
                  "bg-gradient-primary text-primary-foreground shadow-glow",
                  "flex items-center justify-center gap-2 disabled:opacity-40",
                )}
              >
                {describing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                🤖 استخراج DNA
              </Button>
            </div>
          )}

          {/* Visual Veto — Palette swatches */}
          {primaryFile && (
            <PaletteVetoBar
              palettes={PALETTES}
              selected={selectedPalette}
              busy={busy}
              onSelect={(p) => setSelectedPalette(p)}
              onRegenerate={() => runClean(selectedPalette)}
            />
          )}

          {/* Secondary image — back of pack / nutrition label */}
          {primaryFile && !hasDraft && (
            <SecondaryCaptureZone
              url={secondaryUrl}
              busy={busy}
              onFile={onPickSecondary}
              onClear={() => { setSecondaryFile(null); setSecondaryUrl(null); }}
            />
          )}
        </section>

        {/* 2. Hakim Draft Board */}
        {(hasDraft || editMode) && (
          <section className="space-y-4">
            <SectionTitle index="٢" label="لوحة حكيم" hint="حقول الهالة من حكيم — حررها بحرية" />

            <DnaGroup title="الهوية">
              <DnaField label="الاسم" ai={aiFields.has("name")}>
                <Input
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
                  <Input
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); clearAi("category"); }}
                    className="w-full bg-transparent outline-none text-[12.5px]"
                  />
                </DnaField>
                <DnaField label="الماركة" ai={aiFields.has("brand")}>
                  <Input
                    value={brand}
                    onChange={(e) => { setBrand(e.target.value); clearAi("brand"); }}
                    className="w-full bg-transparent outline-none text-[12.5px]"
                  />
                </DnaField>
              </div>
              <DnaField label="بلد المنشأ" ai={aiFields.has("origin")}>
                <Input
                  value={origin}
                  onChange={(e) => { setOrigin(e.target.value); clearAi("origin"); }}
                  className="w-full bg-transparent outline-none text-[12.5px]"
                />
              </DnaField>
            </DnaGroup>

            <DnaGroup title="المالية">
              <div className="grid grid-cols-2 gap-2">
                <DnaField label="السعر" ai={aiFields.has("price")}>
                  <NumInput
                    value={price}
                    step="0.01"
                    onChange={(v) => { setPrice(v); clearAi("price"); }}
                  />
                </DnaField>
                <DnaField label="التكلفة" ai={aiFields.has("cost")}>
                  <NumInput
                    value={cost}
                    step="0.01"
                    onChange={(v) => { setCost(v); clearAi("cost"); }}
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
                <DnaField label={approxWeight ? "الوزن الصافي · وزن تقريبي" : "الوزن الصافي"} ai={aiFields.has("netWeight")}>
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
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setApproxWeight((v) => !v)}
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition",
                      approxWeight
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-transparent border-border/50 text-foreground-tertiary",
                    )}
                    aria-pressed={approxWeight}
                  >
                    {approxWeight ? "≈ وزن تقريبي" : "وزن تقريبي؟"}
                  </Button>
                </DnaField>
              </div>
              <DnaField label="مسببات الحساسية" ai={aiFields.has("allergens")}>
                <Input
                  value={allergens}
                  onChange={(e) => { setAllergens(e.target.value); clearAi("allergens"); }}
                  placeholder="جلوتين، حليب، مكسرات…"
                  className="w-full bg-transparent outline-none text-[12.5px]"
                />
              </DnaField>
            </DnaGroup>

            <DnaGroup title="التسويق">
              <DnaField label="عبارة قصيرة" ai={aiFields.has("marketingShort")}>
                <Input
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
      <footer
        className="fixed inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border/60 shadow-float bottom-20 lg:bottom-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost"
              onClick={() => navigate({ to: "/admin/assets" })}
              disabled={busy}
              className="h-12 px-4 rounded-2xl text-[12.5px] font-semibold press hover:bg-surface-muted disabled:opacity-40"
            >
              إلغاء
            </Button>
            <Button variant="ghost"
              onClick={() => setEditMode(true)}
              disabled={busy || (!hasDraft && !primaryFile)}
              className={cn(
                "h-12 px-4 rounded-2xl text-[12.5px] font-semibold press",
                "bg-foreground/5 hover:bg-foreground/10 border border-border/50",
                "disabled:opacity-40",
              )}
            >
              تعديل
            </Button>
            <Button variant="ghost"
              onClick={approve}
              disabled={busy || done || !canApprove}
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
            </Button>
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
          <Button variant="ghost"
            onClick={onClear}
            className="absolute top-2 left-2 h-9 w-9 rounded-full bg-card/95 border border-border/60 flex items-center justify-center press"
            aria-label="حذف"
          >
            <X className="h-4 w-4" />
          </Button>
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
          <Button variant="ghost"
            type="button" onClick={() => galleryRef.current?.click()}
            className="h-12 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[12.5px] font-semibold press flex items-center justify-center gap-2"
          >
            <ImagePlus className="h-4 w-4" /> من المعرض
          </Button>
          <Button variant="ghost"
            type="button" onClick={() => cameraRef.current?.click()}
            className="h-12 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[12.5px] font-semibold press flex items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" /> الكاميرا
          </Button>
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

function NumInput({
  value,
  onChange,
  step = "0.1",
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  step?: string;
}) {
  // Local string buffer keeps intermediate states like "" or "1." typeable
  // without React snapping the value back to 0 (which would freeze typing).
  const [text, setText] = useState<string>(value === "" ? "" : String(value));
  // Re-sync if the upstream value changes from outside (e.g. AI fill / reset).
  const lastSeen = useRef<number | "">(value);
  if (lastSeen.current !== value) {
    const nextText = value === "" ? "" : String(value);
    if (nextText !== text && Number(text) !== value) setText(nextText);
    lastSeen.current = value;
  }
  return (
    <Input
      type="number"
      step={step}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === "") onChange("");
        else {
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }
      }}
      onBlur={() => {
        if (text === "" || text === "-" || text === ".") {
          setText("");
          onChange("");
        }
      }}
      className="w-full bg-transparent outline-none text-[13px] font-display"
    />
  );
}

function PaletteVetoBar({
  palettes, selected, busy, onSelect, onRegenerate,
}: {
  palettes: PaletteSwatch[];
  selected: PaletteSwatch | null;
  busy: boolean;
  onSelect: (p: PaletteSwatch) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary font-semibold">
          خلفية الأصل · حق النقض البصري
        </span>
        <Button variant="ghost"
          type="button" disabled={busy || !selected}
          onClick={onRegenerate}
          className={cn(
            "text-[10.5px] px-2.5 py-1 rounded-full font-semibold press",
            "bg-primary/10 text-primary border border-primary/30",
            "disabled:opacity-40 inline-flex items-center gap-1",
          )}
        >
          <Wand2 className="h-3 w-3" />
          إعادة توليد الخلفية
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {palettes.map((p) => {
          const active = selected?.name === p.name;
          return (
            <Button variant="ghost"
              key={p.name}
              type="button"
              onClick={() => onSelect(p)}
              title={p.label}
              aria-label={p.label}
              aria-pressed={active}
              className={cn(
                "shrink-0 h-9 w-9 rounded-full border-2 transition press relative",
                active ? "border-primary scale-110 shadow-glow" : "border-border/60",
              )}
              style={{ backgroundColor: p.hex }}
            >
              {active && (
                <CheckCircle2 className="h-4 w-4 text-primary absolute -top-1 -right-1 bg-card rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function SecondaryCaptureZone({
  url, busy, onFile, onClear,
}: {
  url: string | null; busy: boolean;
  onFile: (file: File | null | undefined) => void; onClear: () => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-display leading-tight">
            تصوير ظهر العبوة / الحقائق الغذائية
          </p>
          <p className="text-[10.5px] text-foreground-tertiary mt-0.5">
            اختياري — يساعد حكيم على قراءة الملصق الغذائي والمكونات
          </p>
        </div>
        {url && !busy && (
          <Button variant="ghost"
            onClick={onClear}
            className="h-8 w-8 rounded-full bg-card border border-border/60 flex items-center justify-center press"
            aria-label="حذف"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {url ? (
        <div className="relative h-28 rounded-xl overflow-hidden border border-border/40 bg-background">
          <img src={url} alt="ظهر العبوة" className="absolute inset-0 w-full h-full object-contain" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input
            ref={galleryRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="ghost"
            type="button" disabled={busy} onClick={() => galleryRef.current?.click()}
            className="h-10 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[11.5px] font-semibold press flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <ImagePlus className="h-3.5 w-3.5" /> من المعرض
          </Button>
          <Button variant="ghost"
            type="button" disabled={busy} onClick={() => cameraRef.current?.click()}
            className="h-10 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-border/50 text-[11.5px] font-semibold press flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Camera className="h-3.5 w-3.5" /> الكاميرا
          </Button>
        </div>
      )}
    </div>
  );
}
