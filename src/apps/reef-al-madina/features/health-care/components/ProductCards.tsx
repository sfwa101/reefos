import { useCartActions, useCartLineQty } from "@/core/orders/runtime/react/CartProvider";
import { CheckCircle2, Minus, Plus, Sparkle, Star } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import type { RxProduct } from "../types";

export const RecCard = ({ p, onOpen }: { p: RxProduct; onOpen: () => void }) => (
  <button
    onClick={onOpen}
    className="group relative flex w-[180px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-card text-right ring-1 ring-border/50 shadow-soft transition active:scale-[0.98]"
  >
    <div className="relative aspect-square w-full overflow-hidden bg-muted">
      <OptimizedImage
        src={p.image}
        alt={p.name}
        width={360}
        height={360}
        wrapperClassName="absolute inset-0"
        className="h-full w-full object-cover"
      />
      <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-primary/95 px-2 py-0.5 text-[9px] font-extrabold text-primary-foreground">
        <Sparkle className="h-2.5 w-2.5" /> AI
      </span>
    </div>
    <div className="flex-1 p-2.5">
      <p className="text-[10px] font-bold text-muted-foreground">{p.brand}</p>
      <h4 className="mt-0.5 line-clamp-2 text-[12px] font-extrabold leading-snug text-foreground">
        {p.name}
      </h4>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[12px] font-extrabold text-primary">{p.price} ج.م</span>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-foreground/70">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating}
        </span>
      </div>
    </div>
  </button>
);

export const DetailedProductCard = ({ p, onOpen }: { p: RxProduct; onOpen: () => void }) => {
  const { add, setQty } = useCartActions();
  const qty = useCartLineQty(p.id);
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[20px] bg-card ring-1 ring-border/50 shadow-soft">
      <button onClick={onOpen} className="relative aspect-square w-full overflow-hidden bg-muted">
        <OptimizedImage
          src={p.image}
          alt={p.name}
          width={512}
          height={512}
          wrapperClassName="absolute inset-0"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
            −{discount}%
          </span>
        )}
        <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/95 ring-1 ring-border/40">
          <Sparkle className="h-3 w-3 text-primary" />
        </span>
      </button>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10px] font-bold text-muted-foreground">{p.brand}</p>
        <button onClick={onOpen} className="mt-0.5 text-right">
          <h4 className="line-clamp-2 text-[13px] font-extrabold leading-snug text-foreground">
            {p.name}
          </h4>
        </button>
        <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{p.unit}</p>

        <div className="mt-1.5 flex flex-wrap gap-1">
          {p.badges.slice(0, 2).map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft/70 px-1.5 py-0.5 text-[9px] font-bold text-primary"
            >
              <CheckCircle2 className="h-2.5 w-2.5" /> {b}
            </span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-foreground/75">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {p.rating} · {p.reviews}
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div>
            {p.oldPrice && (
              <span className="block text-[10px] font-bold text-muted-foreground line-through">
                {p.oldPrice} ج.م
              </span>
            )}
            <span className="text-[14px] font-extrabold text-primary">{p.price} ج.م</span>
          </div>
          {qty === 0 ? (
            <button
              onClick={() =>
                add({ id: p.id, name: p.name, price: p.price, image: p.image, unit: p.unit, category: "صيدلية", source: "pharmacy" })
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-1.5 py-1">
              <button
                onClick={() => setQty(p.id, qty - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-foreground active:scale-90"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-[18px] text-center text-[11px] font-extrabold tabular-nums text-primary">
                {qty}
              </span>
              <button
                onClick={() => setQty(p.id, qty + 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
