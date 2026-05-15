/**
 * ProductCard — single product tile for the storefront grid and rails.
 *
 * Wave P-A — consumes the canonical `ProductCardVM` directly. Legacy
 * fields (brand, tagline, fulfillment, depositPct, etaDays, warranty,
 * wakalah eligibility, stock visibility flags) are derived through the
 * `homeProductCardAdapter` — they never re-enter the VM.
 *
 * The `toCompareItem` helper is exported for re-use by other rails that
 * surface the same domain model.
 */
import {
  CalendarClock,
  Crown,
  Plus,
  Scale,
  Star,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import OptimizedImage from "@/components/ui/OptimizedImage";
import { useCartActions, useCartLineQty } from "@/core/orders/runtime/react/CartProvider";
import { useCompare, type CompareItem } from "@/context/CompareContext";
import { toLatin } from "@/lib/format";
import { getById } from "@/core/catalog/runtime/legacyRuntime";
import type { ProductCardVM } from "@/core/catalog/types";

import { fmt } from "../dictionaries";
import { homeProductCardAdapter } from "../adapter";
import { preorderDepositAmount } from "@/core/commerce/policies/deposits";
import { Button } from "@/components/ui/button";

export const toCompareItem = (p: ProductCardVM): CompareItem => {
  const view = homeProductCardAdapter(p);
  return {
    id: p.id,
    name: p.name.ar,
    brand: view.brand,
    image: p.hero?.url ?? "",
    price: p.price.amount,
    oldPrice: p.price.compareAt,
    unit: p.saleUnit,
    rating: p.rating?.avg ?? 0,
    reviews: p.rating?.count ?? 0,
    category: view.catId,
    fulfillment: view.fulfillment,
    etaDays: view.etaDays,
    warranty: view.warranty,
    badges: view.badgeLabels,
    tagline: view.tagline,
  };
};

export const ProductCard = ({
  p,
  onOpen,
  variant = "standard",
  priority = false,
}: {
  p: ProductCardVM;
  onOpen: () => void;
  variant?: "standard" | "minimal";
  /** Eager-load image (above-the-fold tiles). Default: false → lazy. */
  priority?: boolean;
}) => {
  const { add } = useCartActions();
  const qty = useCartLineQty(p.id);
  const compare = useCompare();
  const view = homeProductCardAdapter(p);
  const isPre = view.isPreorder;
  const price = p.price.amount;
  const oldPrice = p.price.compareAt;
  const name = p.name.ar;
  const imageUrl = p.hero?.url ?? "";
  const ratingAvg = p.rating?.avg ?? 0;
  const ratingCount = p.rating?.count ?? 0;
  const deposit = isPre
    ? preorderDepositAmount(price, view.depositPct ?? 25)
    : 0;
  const inCompare = compare.has(p.id);
  const compareFull = !inCompare && compare.items.length >= compare.max;

  // Inventory triage — booleans only (raw stock count is not a VM concern).
  const stock = view.stockQty ?? Number.POSITIVE_INFINITY;
  const isOOS = stock === 0;
  const isWakalah = isOOS && view.isWakalah;
  const isHidden = isOOS && view.hideOnZero && !isWakalah;
  const isHardOOS = isOOS && !isWakalah && !view.hideOnZero;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
    const product = getById(p.id);
    if (!product) {
      toast.error("المنتج غير متاح حالياً");
      return;
    }
    if (isHardOOS) {
      toast.error("نفد المخزون");
      return;
    }
    if (isPre) {
      add(product, 1, {
        payDeposit: true,
        unitPrice: price,
        bookingNote: `حجز مسبق · دفعة مقدمة ${toLatin(deposit.toLocaleString("en-US"))} ج.م`,
      });
      toast.success("تم تأكيد الحجز", {
        description: `دفعة مقدمة ${toLatin(deposit.toLocaleString("en-US"))} ج.م`,
      });
      return;
    }
    if (isWakalah) {
      add(product, 1, {
        properties: { procurement_mode: "wakalah" },
      });
      toast.success("سنوفّره بالوكالة", {
        description: "يضيفه السائق عند توفّره — لا خصم مسبق",
      });
      return;
    }
    add(product);
    toast.success("أُضيف إلى السلة", { description: name });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareFull) {
      toast.error("الحد الأقصى ٤ منتجات للمقارنة");
      return;
    }
    compare.toggle(toCompareItem(p));
    toast.success(inCompare ? "أُزيل من المقارنة" : "أُضيف للمقارنة");
  };

  if (isHidden) return null;

  if (variant === "minimal") {
    return (
      <article
        onClick={onOpen}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-right shadow-soft ring-1 ring-border/50 transition active:scale-[0.98]"
        style={{ contentVisibility: "auto", containIntrinsicSize: "200px 260px" }}
      >
        <div className="relative aspect-square overflow-hidden bg-secondary/40">
          <OptimizedImage
            src={imageUrl}
            alt={name}
            width={512}
            height={512}
            priority={priority}
            className="h-full w-full object-cover object-center"
            wrapperClassName="absolute inset-0"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-1 text-[13px] font-bold leading-tight text-foreground">
            {name}
          </h3>
          <div className="mt-auto flex items-end justify-between">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(price.toLocaleString("en-US"))}
              <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
            </span>
            <Button
              onClick={handleAdd}
              disabled={isHardOOS}
              aria-label={isHardOOS ? "نفد" : isWakalah ? "أضفه إن توفر" : "أضف إلى السلة"}
              title={isWakalah ? "أضفه إن توفر (وكالة)" : undefined}
              className={`flex h-9 items-center justify-center rounded-full px-2 text-[10px] font-extrabold shadow-pill transition active:scale-90 ${
                isHardOOS
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : isWakalah
                    ? "bg-amber-500 text-white"
                    : "w-9 bg-primary text-primary-foreground"
              }`}
            >
              {isHardOOS ? "نفد" : isWakalah ? "وكالة" : <Plus className="h-4 w-4" strokeWidth={3} />}
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onOpen}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-right shadow-soft ring-1 ring-border/50 transition active:scale-[0.99] ${
        isPre ? "ring-2 ring-amber-300/60" : ""
      } ${isHardOOS ? "opacity-60 saturate-50" : ""} ${isWakalah ? "ring-2 ring-amber-400/60" : ""}`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px 340px" }}
    >
      {isPre && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, hsl(40 90% 60% / 0.07), transparent 40%)",
          }}
        />
      )}

      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <OptimizedImage
          src={imageUrl}
          alt={name}
          width={768}
          height={768}
          priority={priority}
          className="h-full w-full object-cover object-center"
          wrapperClassName="absolute inset-0"
        />

        {isPre ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-amber-500 to-amber-600 px-2 py-1 text-[10px] font-extrabold text-white shadow-pill">
            <CalendarClock className="h-3 w-3" />
            حجز · {toLatin(view.etaDays ?? 7)} أيام
          </span>
        ) : (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-extrabold text-white shadow-pill">
            <Truck className="h-3 w-3" />
            يصلك اليوم
          </span>
        )}

        {oldPrice && (
          <span className="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground tabular-nums">
            خصم {toLatin(Math.round(((oldPrice - price) / oldPrice) * 100))}٪
          </span>
        )}

        {isPre && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-bold text-background backdrop-blur">
            <Crown className="h-3 w-3 text-amber-300" />
            Premium
          </span>
        )}

        <Button
          onClick={handleCompare}
          aria-label={inCompare ? "إزالة من المقارنة" : "أضف للمقارنة"}
          className={`absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full shadow-soft backdrop-blur transition active:scale-90 ${
            inCompare
              ? "bg-foreground text-background"
              : compareFull
                ? "bg-background/70 text-muted-foreground"
                : "bg-background/90 text-foreground"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[10px] font-medium text-muted-foreground">{view.brand}</p>
        <h3 className="line-clamp-2 text-[13px] font-extrabold leading-tight text-foreground">
          {name}
        </h3>
        <p className="line-clamp-1 text-[10.5px] text-muted-foreground">{view.tagline}</p>

        <div className="mt-1 flex items-center gap-1 text-[10.5px]">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-bold tabular-nums">{toLatin(ratingAvg)}</span>
          <span className="text-muted-foreground">
            ({toLatin(ratingCount.toLocaleString("en-US"))})
          </span>
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div className="leading-none">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(price.toLocaleString("en-US"))}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
            {oldPrice && (
              <div className="text-[10px] text-muted-foreground line-through tabular-nums">
                {toLatin(oldPrice.toLocaleString("en-US"))} ج.م
              </div>
            )}
          </div>

          <Button
            onClick={handleAdd}
            disabled={isHardOOS}
            aria-label={
              isHardOOS ? "نفد المخزون"
              : isWakalah ? "أضفه إن توفر (وكالة)"
              : isPre ? "احجز الآن"
              : "أضف إلى السلة"
            }
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-[11px] font-extrabold shadow-pill transition active:scale-95 ${
              isHardOOS
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : isWakalah
                  ? "bg-amber-500 text-white"
                  : isPre
                    ? "bg-gradient-to-l from-amber-500 to-amber-600 text-white"
                    : "bg-primary text-primary-foreground"
            }`}
          >
            {isHardOOS ? (
              <>نفد</>
            ) : isWakalah ? (
              <>
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                أضفه إن توفر
              </>
            ) : isPre ? (
              <>
                <CalendarClock className="h-3.5 w-3.5" />
                احجز الآن
              </>
            ) : qty === 0 ? (
              <>
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                للسلة
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                {toLatin(qty)}
              </>
            )}
          </Button>
        </div>

        {isPre && (
          <p className="mt-1.5 text-[9.5px] font-bold text-amber-700">
            ادفع {toLatin(view.depositPct ?? 25)}٪ مقدّم ({fmt(deposit)}) لإتمام الحجز
          </p>
        )}
      </div>
    </article>
  );
};
