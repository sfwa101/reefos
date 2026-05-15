/**
 * VisionGenesisUploader — Phase 7 Part 2 Admin Genesis Portal.
 * Drag & Drop / Camera capture → vision_genesis edge function →
 * "Genesis Review Board" showing the inferred Universal Salsabil
 * Asset (USA), SKUs, and Financial Contract. Approval logs the
 * payload (DB mint wired in Part 3).
 */
import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, UploadCloud, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  type USAGenesisPayload,
  type VisionGenesisError,
} from "@/core/hakim-ai/hooks/useVisionGenesis";
import { useAestheticProcessor } from "@/core/hakim-ai/hooks/useAestheticProcessor";
import { useProductImageUpload } from "@/hooks/useProductImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useInferEntity,
  useApproveInference,
  useRejectInference,
} from "@/core/vision/gateway/hooks";

// Convert a File to a raw base64 string (no data URL prefix).
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)),
    );
  }
  return btoa(binary);
}

const ERROR_MESSAGES: Record<VisionGenesisError, string> = {
  rate_limited: "تم تجاوز حد الطلبات، حاول بعد قليل.",
  credits_exhausted: "نفد رصيد الذكاء الاصطناعي.",
  unauthorized: "يجب تسجيل الدخول كمدير.",
  ai_error: "تعذّر تحليل الصورة، حاول مرة أخرى.",
  ai_parse_error: "تعذّر قراءة استجابة الذكاء الاصطناعي.",
  missing_image: "لم يتم اختيار صورة.",
  missing_key: "إعدادات الذكاء الاصطناعي غير مكتملة.",
  unknown: "حدث خطأ غير متوقع.",
};

const ASSET_TYPE_LABELS: Record<USAGenesisPayload["asset"]["asset_type"], string> = {
  physical: "منتج مادي",
  digital: "منتج رقمي",
  service: "خدمة",
  rental: "إيجار",
  milestone_project: "مشروع بمراحل",
};

const PRICING_LABELS: Record<USAGenesisPayload["financial_contract"]["pricing_model"], string> = {
  flat: "سعر ثابت",
  tiered_wholesale: "أسعار جملة متدرجة",
  subscription: "اشتراك دوري",
  deposit_and_rental: "وديعة + إيجار",
  milestone_installments: "أقساط بمراحل",
};

interface Props {
  readonly onApprove?: (payload: USAGenesisPayload, file?: File | null) => void;
  /** When true, approval hands the payload to the parent (co-pilot mode) instead of minting directly. */
  readonly handoffOnly?: boolean;
}

const VisionGenesisUploader = ({ onApprove, handoffOnly = false }: Props) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [payload, setPayload] = useState<USAGenesisPayload | null>(null);
  const [pendingInferenceId, setPendingInferenceId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mutation = useInferEntity();
  const mintMutation = useApproveInference();
  const rejectMutation = useRejectInference();
  const aestheticMutation = useAestheticProcessor();
  const { upload: uploadProductImage } = useProductImageUpload();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    setFile(f);
    setPayload(null);
    setPendingInferenceId(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => {
    // Fire-and-forget rejection of any unapproved trace so the ledger
    // accurately reflects the Human Veto.
    if (pendingInferenceId) {
      rejectMutation.mutate({
        inference_id: pendingInferenceId,
        reason: "user_discarded",
      });
    }
    setFile(null);
    setPreview(null);
    setPayload(null);
    setPendingInferenceId(null);
    setHint("");
    mutation.reset();
  };

  const analyze = async () => {
    if (!file) return;
    try {
      const image_base64 = await fileToBase64(file);
      const trace = await mutation.mutateAsync({
        image_base64,
        context: hint.trim() ? { hint: hint.trim() } : undefined,
      });
      const draft = trace.draft_payload as unknown as USAGenesisPayload;
      setPayload(draft);
      setPendingInferenceId(trace.id);
      toast.success("تم توليد الأصل العالمي ✨");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "unknown";
      const code = (raw.split(":")[0] || "unknown") as VisionGenesisError;
      toast.error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown ?? raw);
    }
  };

  const approve = async () => {
    if (!payload || !pendingInferenceId) return;
    try {
      // Phase 13 — Imperial Aesthetic Pipeline.
      // Purify the source image (background removal + soft white backdrop)
      // BEFORE minting so every USA enters the catalog visually harmonized.
      let mediaUrl: string | null = null;
      if (file) {
        const purified = await aestheticMutation.mutateAsync({
          file,
          style: "white",
        });
        const blob = await (await fetch(purified.imageDataUrl)).blob();
        mediaUrl = await uploadProductImage({
          file: blob,
          prefix: "usa",
          contentType: "image/png",
          ext: "png",
        });
      }

      const enrichedAsset = mediaUrl
        ? { ...payload.asset, media: [mediaUrl, ...(payload.asset.media ?? [])] }
        : payload.asset;
      const enrichedPayload: USAGenesisPayload = {
        ...payload,
        asset: enrichedAsset,
      };

      if (handoffOnly) {
        // Co-pilot mode: parent will mint. Discard the audited draft so it
        // doesn't dangle as `pending` forever.
        rejectMutation.mutate({
          inference_id: pendingInferenceId,
          reason: "handoff_to_parent",
        });
        onApprove?.(enrichedPayload, file);
        setFile(null);
        setPreview(null);
        setPayload(null);
        setPendingInferenceId(null);
        setHint("");
        mutation.reset();
        return;
      }
      await mintMutation.mutateAsync({ inference_id: pendingInferenceId });
      onApprove?.(enrichedPayload, file);
      // Mint succeeded — clear local state without re-rejecting the now-approved trace.
      setFile(null);
      setPreview(null);
      setPayload(null);
      setPendingInferenceId(null);
      setHint("");
      mutation.reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      if (!msg.startsWith("mint_failed")) toast.error(`تعذّر تحسين/رفع الصورة: ${msg}`);
    }
  };


  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            بوابة التكوين البصري
          </h2>
          <p className="text-[11.5px] text-foreground-tertiary">
            صوّر/ارفع صورة → حكيم Vision يولّد الأصل + الـSKUs + العقد المالي.
          </p>
        </div>
        {payload && (
          <Button
            type="button"
            onClick={reset}
            className="text-[11px] font-bold text-foreground-tertiary hover:text-foreground"
          >
            بدء جديد
          </Button>
        )}
      </header>

      {!payload && (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative rounded-3xl border-2 border-dashed p-6 text-center transition ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border bg-background-secondary"
            }`}
          >
            {preview ? (
              <div className="relative mx-auto w-full max-w-xs">
                <img
                  src={preview}
                  alt="معاينة"
                  className="rounded-2xl object-cover w-full h-48"
                />
                <Button
                  type="button"
                  onClick={reset}
                  className="absolute -top-2 -right-2 rounded-full bg-foreground text-background p-1.5 shadow-lg"
                  aria-label="إزالة"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10">
                  <UploadCloud className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-bold">اسحب صورة هنا</p>
                  <p className="text-[11px] text-foreground-tertiary">
                    منتج · فاتورة مورد · عقد · منشور خدمة
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl bg-foreground text-background text-[12px] font-extrabold press"
                  >
                    اختر ملف
                  </Button>
                  <Button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold press inline-flex items-center gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    كاميرا
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {file && (
            <div className="space-y-2">
              <Input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="سياق إضافي اختياري (مثال: فاتورة مورد جملة)"
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[12.5px] outline-none focus:border-primary"
              />
              <Button
                type="button"
                onClick={analyze}
                disabled={mutation.isPending}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    حكيم يحلّل…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    تحليل وتوليد الأصل
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {payload && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-[10.5px] font-extrabold text-primary mb-2">
              لوحة مراجعة التكوين
            </div>
            {preview && (
              <img
                src={preview}
                alt="المصدر"
                className="rounded-xl w-full h-32 object-cover mb-3"
              />
            )}

            {/* Asset */}
            <section className="mb-3">
              <div className="text-[10px] font-bold text-foreground-tertiary mb-1">
                الأصل (Asset)
              </div>
              <div className="rounded-xl bg-background p-2.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-[13px]">{payload.asset.name}</span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {ASSET_TYPE_LABELS[payload.asset.asset_type]}
                  </span>
                </div>
                <p className="text-[11.5px] text-foreground-secondary leading-relaxed">
                  {payload.asset.description}
                </p>
                {payload.asset.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {payload.asset.traits.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* SKUs */}
            <section className="mb-3">
              <div className="text-[10px] font-bold text-foreground-tertiary mb-1">
                الـSKUs ({payload.skus.length})
              </div>
              <div className="space-y-1.5">
                {payload.skus.map((s) => (
                  <div
                    key={s.sku_code}
                    className="rounded-xl bg-background p-2 text-[11px] flex items-center justify-between gap-2"
                  >
                    <code className="font-mono text-[10.5px] font-extrabold">
                      {s.sku_code}
                    </code>
                    <span className="text-foreground-tertiary truncate text-[10.5px]">
                      {Object.entries(s.attributes)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                ))}
                {payload.skus.length === 0 && (
                  <div className="text-[11px] text-foreground-tertiary">
                    لا توجد متغيرات.
                  </div>
                )}
              </div>
            </section>

            {/* Financial Contract */}
            <section>
              <div className="text-[10px] font-bold text-foreground-tertiary mb-1">
                العقد المالي
              </div>
              <div className="rounded-xl bg-background p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground-secondary">
                    {PRICING_LABELS[payload.financial_contract.pricing_model]}
                  </span>
                  <span className="text-[14px] font-extrabold text-primary">
                    {payload.financial_contract.base_price.toLocaleString("ar-EG")}{" "}
                    {payload.financial_contract.currency}
                  </span>
                </div>
                {Object.keys(payload.financial_contract.contract_rules).length > 0 && (
                  <pre className="mt-2 text-[10px] bg-background-secondary rounded-lg p-2 overflow-auto max-h-32 font-mono leading-relaxed">
                    {JSON.stringify(payload.financial_contract.contract_rules, null, 2)}
                  </pre>
                )}
              </div>
            </section>
          </div>

          <Button
            type="button"
            onClick={approve}
            disabled={aestheticMutation.isPending || (!handoffOnly && mintMutation.isPending)}
            className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {aestheticMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                حكيم يقوم بتحسين الصورة وإزالة الخلفية…
              </>
            ) : !handoffOnly && mintMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري سكّ الأصل…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {handoffOnly ? "تعبئة النموذج بالاقتراح" : "اعتماد وسكّ الأصل العالمي"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VisionGenesisUploader;
