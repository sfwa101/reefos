import { AlertTriangle, Shield, TrendingDown } from "lucide-react";
import { Field, Stat, inputCls } from "./primitives";
import type { ProductRow } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MarginInfo =
  | { kind: "no_cost" }
  | {
      kind: "ok";
      sale: number; cost: number; margin: number; marginPct: number;
      affiliate: number; affiliateAmount: number; netProfit: number;
      discountStatus: "ok" | "warn" | "block";
      discountInfo: { discount: number; max: number; pct: number } | null;
      affiliateStatus: "ok" | "warn" | "block";
    };

interface Props {
  form: ProductRow;
  update: <K extends keyof ProductRow>(k: K, v: ProductRow[K]) => void;
  marginInfo: MarginInfo;
  requiresOverride: boolean;
  canOverride: boolean;
  showOverride: boolean;
  setShowOverride: (v: boolean) => void;
  overrideReason: string;
  setOverrideReason: (v: string) => void;
}

const PricingAndInventory = ({
  form, update, marginInfo, requiresOverride, canOverride,
  showOverride, setShowOverride, overrideReason, setOverrideReason,
}: Props) => {
  return (
    <div className="space-y-4 mt-0">
      <div className="rounded-2xl border border-border/60 bg-surface/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-[13px] font-bold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          التسعير وحماية الهامش
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field label="سعر التكلفة">
            <Input
              type="number" step="0.01"
              value={(form.cost_price as number) ?? ""}
              onChange={(e) => update("cost_price", e.target.value || null)}
              placeholder="ج.م"
              className={inputCls + " num text-right"}
            />
          </Field>
          <Field label="سعر البيع *">
            <Input
              type="number" step="0.01"
              value={form.price as number}
              onChange={(e) => update("price", e.target.value)}
              className={inputCls + " num text-right"}
            />
          </Field>
          <Field label="السعر قبل الخصم">
            <Input
              type="number" step="0.01"
              value={(form.old_price as number) ?? ""}
              onChange={(e) => update("old_price", e.target.value || null)}
              className={inputCls + " num text-right"}
            />
          </Field>
        </div>

        <Field label="نسبة عمولة الأفلييت %">
          <Input
            type="number" step="0.5" min="0" max="50"
            value={(form.affiliate_commission_pct as number) ?? 0}
            onChange={(e) => update("affiliate_commission_pct", e.target.value)}
            className={inputCls + " num text-right"}
          />
        </Field>

        {marginInfo.kind === "no_cost" ? (
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-[12px] text-warning flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>أدخل سعر التكلفة لتفعيل حماية الهامش وحساب صافي الربح.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="هامش ربح" value={marginInfo.margin.toFixed(2)} sub={`${marginInfo.marginPct.toFixed(0)}%`} tone="primary" />
              <Stat label="عمولة شريك" value={marginInfo.affiliateAmount.toFixed(2)} sub={`${marginInfo.affiliate}%`} tone="info" />
              <Stat
                label="صافي الربح"
                value={marginInfo.netProfit.toFixed(2)}
                sub="ج.م"
                tone={marginInfo.netProfit < 0 ? "destructive" : marginInfo.netProfit < marginInfo.margin * 0.2 ? "warning" : "success"}
              />
            </div>

            {marginInfo.discountInfo && (
              <div className={`rounded-xl p-3 text-[12px] flex items-start gap-2 border ${
                marginInfo.discountStatus === "block" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                marginInfo.discountStatus === "warn" ? "bg-warning/10 border-warning/30 text-warning" :
                "bg-success/10 border-success/30 text-success"
              }`}>
                <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {marginInfo.discountStatus === "block" ? (
                    <>
                      <strong>عذراً، هذا الخصم يهدد استدامة الأرباح.</strong>
                      <div className="mt-1">
                        الخصم: <span className="num">{marginInfo.discountInfo.discount.toFixed(2)}</span> ج.م ({marginInfo.discountInfo.pct.toFixed(0)}%)
                        • الحد الأقصى: <span className="num">{marginInfo.discountInfo.max.toFixed(2)}</span> ج.م (50% من الهامش)
                      </div>
                    </>
                  ) : marginInfo.discountStatus === "warn" ? (
                    <>الخصم قريب من الحد المسموح ({marginInfo.discountInfo.max.toFixed(2)} ج.م)</>
                  ) : (
                    <>الخصم آمن: {marginInfo.discountInfo.discount.toFixed(2)} ج.م من حد {marginInfo.discountInfo.max.toFixed(2)}</>
                  )}
                </div>
              </div>
            )}

            {marginInfo.affiliateStatus !== "ok" && (
              <div className={`rounded-xl p-3 text-[12px] flex items-start gap-2 border ${
                marginInfo.affiliateStatus === "block" ? "bg-destructive/10 border-destructive/40 text-destructive" :
                "bg-warning/10 border-warning/30 text-warning"
              }`}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {marginInfo.affiliateStatus === "block"
                    ? "تحذير: مجموع الخصم وعمولة الشريك يتجاوز هامش الربح — خسارة!"
                    : "تحذير ذكي: العمولة تستهلك أكثر من 80% من الهامش بعد الخصم."}
                </span>
              </div>
            )}

            {requiresOverride && canOverride && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-[12.5px] font-bold text-destructive">
                  <Shield className="h-4 w-4" /> تجاوز يدوي مطلوب (سيُسجل باسمك)
                </div>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                  placeholder="اكتب سبب التجاوز (10 أحرف على الأقل)"
                  className={inputCls + " resize-none py-2 h-auto"}
                />
                <Button
                  onClick={() => setShowOverride(true)}
                  disabled={overrideReason.trim().length < 10}
                  className="w-full h-10 rounded-xl bg-destructive text-destructive-foreground text-[12.5px] font-bold press disabled:opacity-40"
                >
                  أوافق على التجاوز ومسؤولية القرار
                </Button>
              </div>
            )}
            {requiresOverride && !canOverride && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-[12px] text-destructive flex items-start gap-2">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>صلاحية التجاوز اليدوي للمدير فقط.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="المخزون">
          <Input type="number" value={form.stock} onChange={(e) => update("stock", Number(e.target.value))} className={inputCls + " num text-right"} />
        </Field>
        <Field label="الترتيب">
          <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", Number(e.target.value))} className={inputCls + " num text-right"} />
        </Field>
      </div>
    </div>
  );
};

export default PricingAndInventory;
