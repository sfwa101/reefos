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
  useVisionGenesis,
  type USAGenesisPayload,
  type VisionGenesisError,
} from "@/core-os/hakim-ai/hooks/useVisionGenesis";
import { useMintUSA } from "@/core-os/hakim-ai/hooks/useMintUSA";

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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mutation = useVisionGenesis();
  const mintMutation = useMintUSA();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    setFile(f);
    setPayload(null);
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
    setFile(null);
    setPreview(null);
    setPayload(null);
    setHint("");
    mutation.reset();
  };

  const analyze = async () => {
    if (!file) return;
    try {
      const result = await mutation.mutateAsync({ file, hint: hint.trim() || undefined });
      setPayload(result);
      toast.success("تم توليد الأصل العالمي ✨");
    } catch (e) {
      const code = (e instanceof Error ? e.message : "unknown") as VisionGenesisError;
      toast.error(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown);
    }
  };

  const approve = async () => {
    if (!payload) return;
    if (handoffOnly) {
      onApprove?.(payload, file);
      reset();
      return;
    }
    try {
      await mintMutation.mutateAsync({
        asset: payload.asset,
        skus: payload.skus,
        financial_contract: payload.financial_contract,
      });
      onApprove?.(payload, file);
      reset();
    } catch {
      // toast handled in hook
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
          <button
            type="button"
            onClick={reset}
            className="text-[11px] font-bold text-foreground-tertiary hover:text-foreground"
          >
            بدء جديد
          </button>
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
                <button
                  type="button"
                  onClick={reset}
                  className="absolute -top-2 -right-2 rounded-full bg-foreground text-background p-1.5 shadow-lg"
                  aria-label="إزالة"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl bg-foreground text-background text-[12px] font-extrabold press"
                  >
                    اختر ملف
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-extrabold press inline-flex items-center gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    كاميرا
                  </button>
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
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="سياق إضافي اختياري (مثال: فاتورة مورد جملة)"
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[12.5px] outline-none focus:border-primary"
              />
              <button
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
              </button>
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

          <button
            type="button"
            onClick={approve}
            disabled={!handoffOnly && mintMutation.isPending}
            className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-extrabold press inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {!handoffOnly && mintMutation.isPending ? (
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
          </button>
        </div>
      )}
    </div>
  );
};

export default VisionGenesisUploader;
