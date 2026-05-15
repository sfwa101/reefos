// 4-step cloud print wizard (upload → options → binding → live calculator).
// Self-contained: owns its own state and submits a print_jobs row + cart line.

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Calculator, CheckCircle2, Clock, Minus, Plus, Upload,
} from "lucide-react";
import { useCartActions } from "@/core/orders/runtime/react/CartProvider";
import { useAuth } from "@/context/AuthContext";
import { submitPrintJobFn, uploadPrintFileFn } from "@/core/library/library.functions";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { fmtMoney, toLatin } from "@/lib/format";
import {
  calcPrintTotal, PRINT_PRICES, PRINT_PREP_HOURS,
  type BindingKey, type PrintConfig,
} from "@/lib/digital-borrowing";
import { PALETTE } from "../data";

export const PrintWizard = () => {
  const { user } = useAuth();
  const { add } = useCartActions();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [pages, setPages] = useState(10);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [sided, setSided] = useState<"single" | "double">("single");
  const [binding, setBinding] = useState<BindingKey>("none");
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg: PrintConfig = { pages, copies, colorMode, sided, binding };
  const total = calcPrintTotal(cfg);

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (!user) { toast.error("سجل الدخول لرفع الملف"); return; }
    setFile(f);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { path } = await uploadPrintFileFn({ data: fd });
      setFilePath(path);
      toast.success("تم رفع الملف بنجاح");
    } catch {
      toast.error("فشل رفع الملف");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!user) { toast.error("سجل الدخول أولاً"); return; }
    try {
      await submitPrintJobFn({
        data: {
          filePath, fileName: file?.name ?? null,
          pages, copies, colorMode, sided, binding, total,
        },
      });
      const printProduct: Product = {
        id: `print-${Date.now()}`,
        name: `طلب طباعة: ${file?.name ?? "ملف"}`,
        unit: `${toLatin(pages)} صفحة · ${toLatin(copies)} نسخة`,
        price: total,
        image: "",
        category: "طباعة سحابية",
        source: "library",
      };
      add(printProduct, 1, {
        kind: "print",
        unitPrice: total,
        prepHours: PRINT_PREP_HOURS,
        printConfig: { pages, copies, colorMode, sided, binding, fileName: file?.name, filePath: filePath ?? undefined },
      });
      toast.success("تمت إضافة طلب الطباعة للسلة");
      setStep(1); setFile(null); setFilePath(null); setPages(10); setCopies(1);
      setColorMode("bw"); setSided("single"); setBinding("none");
    } catch {
      toast.error("فشل إنشاء الطلب");
    }
  };

  const StepDot = ({ n }: { n: number }) => (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${step >= n ? "text-white" : "bg-foreground/10 text-muted-foreground"}`}
         style={step >= n ? { background: PALETTE.primary } : undefined}>{toLatin(n)}</div>
  );

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-3 shadow-soft">
        {[1, 2, 3, 4].map((n, i) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <StepDot n={n} />
            {i < 3 && <div className={`h-0.5 flex-1 ${step > n ? "" : "bg-foreground/10"}`} style={step > n ? { background: PALETTE.primary } : undefined} />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="font-display text-base font-extrabold">1. ارفع ملفك</h3>
          <p className="mt-1 text-xs text-muted-foreground">PDF أو Word — حتى 20 ميجا</p>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 text-sm font-bold disabled:opacity-50"
            style={{ borderColor: PALETTE.primary, color: PALETTE.primary }}
          >
            {uploading ? <><Upload className="h-5 w-5 animate-pulse" /> جارٍ الرفع…</> :
              file ? <><CheckCircle2 className="h-5 w-5" /> {file.name}</> :
              <><Upload className="h-5 w-5" /> اختر ملفاً</>}
          </button>
          <button
            disabled={!file || uploading}
            onClick={() => setStep(2)}
            className="mt-3 w-full rounded-2xl py-3 text-sm font-extrabold text-white disabled:opacity-40"
            style={{ background: PALETTE.primary }}
          >التالي</button>
        </div>
      )}

      {/* Step 2: Options */}
      {step === 2 && (
        <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="font-display text-base font-extrabold">2. خيارات الطباعة</h3>

          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">الألوان</p>
            <div className="grid grid-cols-2 gap-2">
              {([["bw", "أبيض وأسود", "1 ج.م/صفحة"], ["color", "ألوان", "3 ج.م/صفحة"]] as const).map(([id, label, sub]) => {
                const active = colorMode === id;
                return (
                  <button key={id} onClick={() => setColorMode(id)}
                    className={`rounded-2xl p-3 text-center text-xs font-bold ${active ? "text-white" : "bg-foreground/5"}`}
                    style={active ? { background: PALETTE.primary } : undefined}>
                    <p className="font-extrabold">{label}</p>
                    <p className={`mt-0.5 text-[10px] ${active ? "opacity-90" : "text-muted-foreground"}`}>{sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">عدد الأوجه</p>
            <div className="grid grid-cols-2 gap-2">
              {([["single", "وجه واحد", ""], ["double", "وجهين", "خصم 20%"]] as const).map(([id, label, sub]) => {
                const active = sided === id;
                return (
                  <button key={id} onClick={() => setSided(id)}
                    className={`rounded-2xl p-3 text-center text-xs font-bold ${active ? "text-white" : "bg-foreground/5"}`}
                    style={active ? { background: PALETTE.primary } : undefined}>
                    <p className="font-extrabold">{label}</p>
                    {sub && <p className={`mt-0.5 text-[10px] ${active ? "opacity-90" : "text-emerald-600"}`}>{sub}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 rounded-2xl bg-foreground/5 py-3 text-sm font-bold">رجوع</button>
            <button onClick={() => setStep(3)} className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white" style={{ background: PALETTE.primary }}>التالي</button>
          </div>
        </div>
      )}

      {/* Step 3: Binding */}
      {step === 3 && (
        <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="font-display text-base font-extrabold">3. التغليف</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(PRINT_PRICES.binding) as [BindingKey, number][]).map(([id, price]) => {
              const active = binding === id;
              const labels: Record<BindingKey, string> = { none: "بدون", spiral: "كعب حلزوني سلك", plastic: "كعب بلاستيك", thermal: "تغليف حراري" };
              return (
                <button key={id} onClick={() => setBinding(id)}
                  className={`rounded-2xl p-3 text-center text-xs font-bold ${active ? "text-white" : "bg-foreground/5"}`}
                  style={active ? { background: PALETTE.primary } : undefined}>
                  <p className="font-extrabold">{labels[id]}</p>
                  <p className={`mt-0.5 text-[10px] ${active ? "opacity-90" : "text-muted-foreground"}`}>+{toLatin(price)} ج.م</p>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 rounded-2xl bg-foreground/5 py-3 text-sm font-bold">رجوع</button>
            <button onClick={() => setStep(4)} className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white" style={{ background: PALETTE.primary }}>التالي</button>
          </div>
        </div>
      )}

      {/* Step 4: Live calculator + confirm */}
      {step === 4 && (
        <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="flex items-center gap-2 font-display text-base font-extrabold">
            <Calculator className="h-5 w-5" style={{ color: PALETTE.primary }} /> 4. الحاسبة الحية
          </h3>

          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">عدد الصفحات</p>
            <div className="flex items-center gap-3 rounded-2xl bg-foreground/5 p-2">
              <button onClick={() => setPages((p) => Math.max(1, p - 5))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card"><Minus className="h-4 w-4" /></button>
              <input type="number" value={pages} onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-transparent text-center font-display text-lg font-extrabold outline-none" />
              <button onClick={() => setPages((p) => p + 5)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">عدد النسخ</p>
            <div className="flex items-center gap-3 rounded-2xl bg-foreground/5 p-2">
              <button onClick={() => setCopies((c) => Math.max(1, c - 1))} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card"><Minus className="h-4 w-4" /></button>
              <span className="flex-1 text-center font-display text-lg font-extrabold">{toLatin(copies)}</span>
              <button onClick={() => setCopies((c) => c + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-card"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="space-y-1.5 rounded-2xl p-3 text-xs" style={{ background: PALETTE.primarySoft }}>
            <div className="flex justify-between"><span className="text-muted-foreground">{toLatin(pages)} صفحة × {colorMode === "color" ? "3" : "1"} ج.م</span><span className="font-bold">{fmtMoney(pages * (colorMode === "color" ? 3 : 1))}</span></div>
            {sided === "double" && <div className="flex justify-between text-emerald-700"><span>خصم وجهين 20%</span><span>-</span></div>}
            {binding !== "none" && <div className="flex justify-between"><span className="text-muted-foreground">تغليف</span><span className="font-bold">+{fmtMoney(PRINT_PRICES.binding[binding])}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">× {toLatin(copies)} نسخة</span><span /></div>
            <div className="border-t pt-1.5 flex justify-between"><span className="font-extrabold">الإجمالي</span><span className="font-display text-xl font-extrabold" style={{ color: PALETTE.primary }}>{fmtMoney(total)}</span></div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900">
            <Clock className="h-4 w-4" />
            <span>وقت التجهيز: خلال {toLatin(PRINT_PREP_HOURS)} ساعات من التأكيد.</span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="flex-1 rounded-2xl bg-foreground/5 py-3 text-sm font-bold">رجوع</button>
            <button onClick={submit} className="flex-[2] rounded-2xl py-3.5 text-sm font-extrabold text-white" style={{ background: PALETTE.primary }}>
              أضف للسلة — {fmtMoney(total)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
