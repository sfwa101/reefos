import { memo, useCallback, type MouseEvent } from "react";
import { Clock, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useCartActions, useCartLineQty } from "@/context/CartContext";
import { toLatin } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/products";
import { FALLBACK_IMG, getPrep, type RestoProduct } from "../types";

interface Props {
  readonly p: RestoProduct;
}

const MealRowComponent = ({ p }: Props) => {
  const { add } = useCartActions();
  const qty = useCartLineQty(p.id);
  const prep = getPrep(p.metadata);

  const handleAdd = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      add({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        image: p.image ?? FALLBACK_IMG,
        unit: "وجبة",
        category: p.brand ?? "مطاعم",
        source: "restaurants",
      } as unknown as Product);
      toast.success("أُضيف إلى السلة", { description: p.name });
    },
    [add, p],
  );

  return (
    <article
      dir="rtl"
      className="flex items-stretch gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/40 transition active:scale-[0.99]"
    >
      <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-secondary/40 shadow-soft">
        <img
          src={p.image ?? FALLBACK_IMG}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className="truncate text-[14px] font-extrabold leading-tight text-foreground">
          {p.name}
        </h4>

        {p.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {p.description}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2 text-[10.5px] text-muted-foreground">
          {prep !== null && (
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" strokeWidth={2.4} />
              <span className="tabular-nums">{toLatin(prep)} د</span>
            </span>
          )}
          {p.rating != null && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-bold tabular-nums text-foreground">
                {toLatin(Number(p.rating))}
              </span>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="leading-none">
            <span className="font-display text-[17px] font-extrabold tabular-nums text-primary">
              {toLatin(Number(p.price).toLocaleString("en-US"))}
            </span>
            <span className="ms-1 text-[10px] font-bold text-primary/70">
              ج.م
            </span>
          </div>
          <button
            onClick={handleAdd}
            aria-label="أضف إلى السلة"
            className={cn(
              "flex h-9 items-center gap-1 rounded-full px-3.5 text-[11px] font-extrabold shadow-pill transition active:scale-90",
              qty === 0
                ? "bg-primary text-primary-foreground"
                : "bg-foreground text-background",
            )}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            <span className="tabular-nums">
              {qty === 0 ? "أضف" : toLatin(qty)}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
};

export const MealRow = memo(MealRowComponent);
