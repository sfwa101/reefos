/**
 * DetailSheet — bottom-sheet modal showing full product detail with
 * preorder payment breakdown. Verbatim extraction. Owns its own
 * scroll-lock effect; relies on Cart actions for the confirm CTA.
 *
 * Internal helpers (`TrustBadge`, `Chip`, `Row`) are co-located here
 * because they are only consumed by the sheet itself.
 */
import { useEffect, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Lock,
  Plus,
  ShieldCheck,
  Star,
  Truck,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useCartActions } from "@/core/orders/runtime/react/CartProvider";
import { toLatin } from "@/lib/format";

import { getById } from "@/core/catalog/runtime/legacyRuntime";
import type { ProductCardVM } from "@/core/catalog/types";

import { fmt } from "../dictionaries";
import { homeProductCardAdapter } from "../adapter";
import { preorderDepositAmount } from "@/core/commerce/policies/deposits";

const TrustBadge = ({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) => (
  <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary/60 p-2 text-center">
    <Icon className="h-4 w-4 text-foreground" />
    <span className="text-[10px] font-extrabold text-foreground">{label}</span>
  </div>
);

const Chip = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-foreground">
    {children}
  </span>
);

const Row = ({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) => (
  <div className="flex items-center justify-between text-[12px]">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={`tabular-nums ${
        accent
          ? "font-extrabold text-amber-700"
          : bold
            ? "font-extrabold"
            : "font-bold"
      }`}
    >
      {value}
    </span>
  </div>
);

export const DetailSheet = ({
  product,
  onClose,
}: {
  product: ProductCardVM;
  onClose: () => void;
}) => {
  const { add } = useCartActions();
  const view = homeProductCardAdapter(product);
  const isPre = view.isPreorder;
  const price = product.price.amount;
  const oldPrice = product.price.compareAt;
  const name = product.name.ar;
  const imageUrl = product.hero?.url ?? "";
  const ratingAvg = product.rating?.avg ?? 0;
  const ratingCount = product.rating?.count ?? 0;
  const deposit = isPre
    ? preorderDepositAmount(price, view.depositPct ?? 25)
    : 0;
  const remaining = price - deposit;

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleConfirm = () => {
    const dbProduct = getById(product.id);
    if (!dbProduct) {
      toast.error("المنتج غير متاح حالياً");
      return;
    }
    add(
      dbProduct,
      1,
      isPre
        ? {
            payDeposit: true,
            unitPrice: price,
            bookingNote: `حجز مسبق · دفعة مقدمة ${toLatin(deposit.toLocaleString("en-US"))} ج.م — المتبقي ${toLatin(remaining.toLocaleString("en-US"))} ج.م عند الاستلام`,
          }
        : undefined,
    );
    toast.success(isPre ? "تم تأكيد الحجز" : "أُضيف إلى السلة", {
      description: isPre
        ? `دفعة مقدمة ${toLatin(deposit.toLocaleString("en-US"))} ج.م`
        : name,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-t-[28px] bg-background shadow-2xl ring-1 ring-border/60 animate-in slide-in-from-bottom-8"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">
            {isPre ? "منتج بالحجز المسبق" : "متوفر للتسليم الفوري"}
          </span>
          <span className="w-8" />
        </div>

        <div className="max-h-[calc(90vh-60px)] overflow-y-auto pb-32">
          <div className="relative aspect-[4/3] bg-secondary/40">
            <img
              src={imageUrl}
              alt={name}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
            />
            {isPre ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-500 to-amber-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-pill">
                <CalendarClock className="h-3.5 w-3.5" />
                حجز مسبق · استلام خلال {toLatin(view.etaDays ?? 7)} أيام
              </span>
            ) : (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-pill">
                <Truck className="h-3.5 w-3.5" />
                تسليم اليوم
              </span>
            )}
          </div>

          <div className="px-4 pt-4">
            <p className="text-[11px] font-bold text-muted-foreground">
              {view.brand}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-extrabold leading-tight text-foreground">
              {name}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {view.tagline}
            </p>

            <div className="mt-2 flex items-center gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold tabular-nums">
                  {toLatin(ratingAvg)}
                </span>
              </span>
              <span className="text-muted-foreground">
                ({toLatin(ratingCount.toLocaleString("en-US"))} تقييم)
              </span>
            </div>

            {/* Price block */}
            <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border/60">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-extrabold tabular-nums">
                  {toLatin(price.toLocaleString("en-US"))}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  ج.م
                </span>
                {oldPrice && (
                  <span className="text-[12px] text-muted-foreground line-through tabular-nums">
                    {toLatin(oldPrice.toLocaleString("en-US"))} ج.م
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <TrustBadge
                  icon={ShieldCheck}
                  label={view.warranty ? "ضمان وكيل" : "بضاعة أصلية"}
                />
                <TrustBadge icon={Wrench} label="صيانة معتمدة" />
                <TrustBadge icon={Lock} label="دفع آمن" />
              </div>

              {view.warranty && (
                <p className="mt-3 text-[11px] font-bold text-emerald-700">
                  ✓ {view.warranty}
                </p>
              )}
            </div>

            {/* Preorder payment breakdown */}
            {isPre && (
              <div className="mt-3 overflow-hidden rounded-2xl ring-2 ring-amber-300/70">
                <div className="bg-gradient-to-l from-amber-500 to-amber-600 px-4 py-2 text-[11px] font-extrabold text-white">
                  تفاصيل دفعة الحجز المسبق
                </div>
                <div className="space-y-2 bg-amber-50/60 px-4 py-3">
                  <Row label="السعر الإجمالي" value={fmt(price)} bold />
                  <Row
                    label={`الدفعة المقدمة (${toLatin(view.depositPct ?? 25)}٪)`}
                    value={fmt(deposit)}
                    accent
                  />
                  <Row label="المتبقي عند الاستلام" value={fmt(remaining)} />
                  <p className="pt-1 text-[10.5px] text-amber-800">
                    سيتم التواصل لتأكيد موعد التسليم خلال {toLatin(view.etaDays ?? 7)} أيام عمل.
                  </p>
                </div>
              </div>
            )}

            {/* Specs */}
            <div className="mt-4">
              <h3 className="text-[12px] font-extrabold text-foreground">
                المواصفات الرئيسية
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip>{product.saleUnit}</Chip>
                {view.badgeLabels.map((b) => (
                  <Chip key={b}>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    {b}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="absolute inset-x-0 bottom-0 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur">
          <button
            onClick={handleConfirm}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold shadow-pill transition active:scale-[0.98] ${
              isPre
                ? "bg-gradient-to-l from-amber-500 to-amber-600 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {isPre ? (
              <>
                <CalendarClock className="h-4 w-4" />
                احجز بدفعة {fmt(deposit)}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" strokeWidth={3} />
                أضف إلى السلة — {fmt(price)}
              </>
            )}
          </button>
          {isPre && (
            <p className="mt-1.5 text-center text-[10px] font-bold text-muted-foreground">
              ادفع {fmt(deposit)} الآن — والمتبقي {fmt(remaining)} عند الاستلام
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
