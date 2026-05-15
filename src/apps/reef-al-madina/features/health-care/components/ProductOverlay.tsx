import { useEffect, useMemo, useState } from "react";
import { useCartActions, useCartLineQty } from "@/core/orders/runtime/react/CartProvider";
import { Bot, Calculator, CheckCircle2, Plus, Sparkle, Star, X } from "lucide-react";
import { toast } from "sonner";
import OptimizedImage from "@/components/ui/OptimizedImage";
import type { RxProduct } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ProductOverlay = ({ p, onClose }: { p: RxProduct; onClose: () => void }) => {
  const { add } = useCartActions();
  const qty = useCartLineQty(p.id);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(30);

  const aiDose = useMemo(() => {
    const base = p.category === "vitamins" ? 1 : 1;
    const wFactor = weight > 80 ? 1.25 : weight < 50 ? 0.75 : 1;
    const aFactor = age > 65 ? 0.85 : 1;
    const rec = Math.max(1, Math.round(base * wFactor * aFactor));
    return rec;
  }, [p.category, weight, age]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        onClick={onClose}
        className="absolute inset-0 animate-overlay-fade bg-black/50"
        aria-hidden
      />
      <div
        className="relative animate-overlay max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-background ring-1 ring-border/60 sm:rounded-[28px]"
        style={{ boxShadow: "0 -20px 60px -10px rgba(0,0,0,0.25)" }}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-background to-transparent pt-2 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>

        <Button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-foreground shadow-pill ring-1 ring-border/50 active:scale-90"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <OptimizedImage
            src={p.image}
            alt={p.name}
            width={800}
            height={600}
            priority
            wrapperClassName="absolute inset-0"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-extrabold text-foreground ring-1 ring-border/40">
            <Sparkle className="h-3 w-3 text-primary" /> منتج موصى به AI
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] font-bold text-muted-foreground">{p.brand}</p>
          <h2 className="mt-0.5 font-display text-[20px] font-extrabold leading-tight text-foreground">
            {p.name}
          </h2>
          <p className="mt-1 text-[12px] font-medium text-muted-foreground">{p.tagline}</p>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-[20px] font-extrabold text-primary">{p.price} ج.م</span>
            {p.oldPrice && (
              <span className="text-[12px] font-bold text-muted-foreground line-through">
                {p.oldPrice} ج.م
              </span>
            )}
            <span className="mr-auto inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {p.rating} · {p.reviews}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-primary-soft/80 px-2.5 py-1 text-[10.5px] font-extrabold text-primary"
              >
                <CheckCircle2 className="h-3 w-3" /> {b}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-card/80 p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <Calculator className="h-4 w-4 text-primary" strokeWidth={2.4} />
              </span>
              <h3 className="text-[13px] font-extrabold text-foreground">
                آلة حاسبة للجرعة الذكية
              </h3>
              <span className="mr-auto inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                AI
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-bold text-foreground/85">
                الوزن (كجم)
                <Input
                  type="number"
                  min={20}
                  max={200}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm font-extrabold text-foreground ring-1 ring-border/50 outline-none focus:ring-primary"
                />
              </label>
              <label className="block text-[11px] font-bold text-foreground/85">
                العمر
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl bg-background px-3 py-2 text-sm font-extrabold text-foreground ring-1 ring-border/50 outline-none focus:ring-primary"
                />
              </label>
            </div>

            <div className="mt-3 rounded-xl bg-primary/10 p-3">
              <p className="text-[11px] font-bold text-primary/80">الجرعة المقترحة</p>
              <p className="mt-0.5 text-[14px] font-extrabold text-foreground">
                {aiDose} {p.category === "vitamins" ? "كبسولة" : "وحدة"} يومياً · {p.dosage}
              </p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                * استشر طبيبك قبل أي تعديل دائم على الجرعة
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border/60 bg-card/80 p-3.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                <Bot className="h-4 w-4 text-amber-600" strokeWidth={2.4} />
              </span>
              <h3 className="text-[13px] font-extrabold text-foreground">تقييمات AI للمستخدمين</h3>
            </div>
            <p className="mt-2 text-[12px] font-medium leading-relaxed text-foreground/85">
              لخّص الذكاء الاصطناعي {p.reviews} تقييماً: المستخدمون يثنون على
              <span className="font-extrabold text-foreground"> الفعالية السريعة</span>
              {" و "}
              <span className="font-extrabold text-foreground">جودة التغليف</span>،
              مع ملاحظات إيجابية على نسبة <span className="font-extrabold text-foreground">{p.rating} من 5</span>.
            </p>
          </div>

          <Button
            onClick={() => {
              add({ id: p.id, name: p.name, price: p.price, image: p.image, unit: p.unit, category: "صيدلية", source: "pharmacy" });
              toast.success("أُضيف للسلة", { description: p.name });
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-pill active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            {qty > 0 ? `أضِف المزيد (${qty} في السلة)` : `أضِف للسلة · ${p.price} ج.م`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductOverlay;
