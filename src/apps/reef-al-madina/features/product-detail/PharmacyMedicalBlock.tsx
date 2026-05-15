import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Pharmacy: Professional medical info + Smart Dosage Calculator UI.
 * Verbatim extraction from ProductDetail.tsx — UI/logic preserved.
 */
const PharmacyMedicalBlock = ({
  meta,
  productName,
}: {
  meta: Record<string, any>;
  productName: string;
}) => {
  const activeIngredient = meta.active_ingredient || meta.activeIngredient;
  const dosageDefault = meta.dosage || meta.recommended_dosage;
  const requiresRx = meta.requires_prescription || meta.requiresPrescription;
  const sideEffects = meta.side_effects || meta.sideEffects;
  const storage = meta.storage_instructions || meta.storage;

  const [weight, setWeight] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [computed, setComputed] = useState<string | null>(null);

  const compute = () => {
    const w = Number(weight);
    const a = Number(age);
    if (!w || !a) {
      setComputed("يرجى إدخال الوزن والعمر بشكل صحيح.");
      return;
    }
    if (a < 12) {
      const perKg = Math.max(5, Math.min(15, Math.round((w * 10) / 1)) / 10);
      setComputed(`الجرعة المقترحة: حوالي ${perKg} مج/كجم كل 6–8 ساعات. استشر الصيدلي قبل البدء.`);
    } else {
      setComputed("الجرعة المقترحة للبالغين: 1 قرص كل 6–8 ساعات حسب الحاجة، بحد أقصى 4 جرعات يومياً.");
    }
  };

  const hasMedical =
    activeIngredient || dosageDefault || requiresRx || sideEffects || storage;

  return (
    <section className="space-y-3">
      {hasMedical && (
        <div
          className="rounded-2xl p-4 ring-1 ring-primary/15 shadow-soft"
          style={{
            background:
              "linear-gradient(135deg, hsl(168 55% 96%) 0%, hsl(195 55% 97%) 100%)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-foreground inline-flex items-center gap-1.5">
              <span className="text-lg" aria-hidden>💊</span>
              المعلومات الطبية
            </h3>
            {requiresRx && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[10px] font-extrabold text-rose-700 ring-1 ring-rose-500/30">
                <span aria-hidden>📝</span>
                يتطلب روشتة طبية
              </span>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-2 text-[12.5px]">
            {activeIngredient && (
              <div className="flex items-start justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
                <dt className="font-bold text-muted-foreground">المادة الفعالة</dt>
                <dd className="text-right font-extrabold text-foreground">{activeIngredient}</dd>
              </div>
            )}
            {dosageDefault && (
              <div className="flex items-start justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
                <dt className="font-bold text-muted-foreground">الجرعة الموصى بها</dt>
                <dd className="text-right font-extrabold text-foreground">{dosageDefault}</dd>
              </div>
            )}
            {storage && (
              <div className="flex items-start justify-between gap-3 rounded-xl bg-background/70 px-3 py-2">
                <dt className="font-bold text-muted-foreground">التخزين</dt>
                <dd className="text-right font-extrabold text-foreground">{storage}</dd>
              </div>
            )}
            {sideEffects && (
              <div className="rounded-xl bg-background/70 px-3 py-2">
                <dt className="mb-1 font-bold text-muted-foreground">الأعراض الجانبية المحتملة</dt>
                <dd className="text-[12px] leading-relaxed text-foreground/80">{sideEffects}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-2xl p-4 text-primary-foreground shadow-tile"
        style={{
          background:
            "linear-gradient(135deg, hsl(168 55% 28%) 0%, hsl(210 55% 32%) 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-foreground/10 blur-xl"
        />
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
            <span className="text-base" aria-hidden>🧮</span>
          </span>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[9.5px] font-extrabold">
              AI · تجريبي
            </div>
            <h3 className="font-display text-base font-extrabold leading-tight">
              آلة حاسبة للجرعة الذكية
            </h3>
          </div>
        </div>
        <p className="mb-3 text-[11.5px] leading-snug text-primary-foreground/85">
          أدخل وزنك وعمرك لاقتراح جرعة مبدئية لـ{" "}
          <span className="font-extrabold">{productName}</span> — لا يُعد بديلاً عن استشارة الطبيب.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-bold text-primary-foreground/80">الوزن (كجم)</span>
            <Input
              inputMode="numeric"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70"
              className="w-full rounded-xl bg-primary-foreground/15 px-3 py-2 text-sm font-extrabold text-primary-foreground placeholder:text-primary-foreground/40 outline-none ring-1 ring-primary-foreground/20 focus:ring-primary-foreground/50"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-bold text-primary-foreground/80">العمر (سنة)</span>
            <Input
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
              className="w-full rounded-xl bg-primary-foreground/15 px-3 py-2 text-sm font-extrabold text-primary-foreground placeholder:text-primary-foreground/40 outline-none ring-1 ring-primary-foreground/20 focus:ring-primary-foreground/50"
            />
          </label>
        </div>
        <Button
          onClick={compute}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-foreground px-3 py-2.5 text-[13px] font-extrabold text-emerald-800 shadow-pill transition active:scale-[0.98]"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.6} />
          احسب الجرعة المقترحة
        </Button>
        {computed && (
          <div className="mt-3 rounded-xl bg-primary-foreground/10 p-3 text-[12px] font-bold leading-relaxed ring-1 ring-primary-foreground/20">
            {computed}
          </div>
        )}
        <p className="mt-2 text-[10px] text-primary-foreground/70">
          ⚠️ هذه التوصية إرشادية فقط ولا تُغني عن استشارة طبيب أو صيدلي مرخّص.
        </p>
      </div>
    </section>
  );
};

export default PharmacyMedicalBlock;
