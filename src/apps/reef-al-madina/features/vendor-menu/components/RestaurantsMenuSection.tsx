/**
 * Restaurants — premium food-delivery storefront (Talabat/UberEats-tier).
 * Live Supabase fetch grouped by brand. Vertical MealRow layout, sticky
 * restaurant tabs, mobile-first RTL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Plus, Search, Star, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import BackHeader from "@/components/BackHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartActions, useCartLineQty } from "@/core/orders/runtime/react/CartProvider";
import { storeThemes } from "@/lib/storeThemes";
import { toLatin } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/core/catalog/legacyProduct.types";
import { fetchRestaurantAssets, type RestoProductRow } from "@/core/commerce/knowledge/sovereignCatalog";

type RestoProduct = RestoProductRow;


const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&auto=format&fit=crop";

const getPrep = (m: RestoProduct["metadata"]): number | null => {
  if (!m || typeof m !== "object") return null;
  const v = (m as Record<string, unknown>).prepTime;
  return typeof v === "number" ? v : null;
};

/* ----------------------------- Meal Row ----------------------------- */

const MealRow = ({ p }: { p: RestoProduct }) => {
  const { add } = useCartActions();
  const qty = useCartLineQty(p.id);
  const prep = getPrep(p.metadata);

  const handleAdd = (e: React.MouseEvent) => {
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
  };

  return (
    <article
      dir="rtl"
      className="flex items-stretch gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/40 transition active:scale-[0.99]"
    >
      {/* Image — right side in RTL */}
      <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-secondary/40 shadow-soft">
        <img
          src={p.image ?? FALLBACK_IMG}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Details — left */}
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

        {/* Price + Add */}
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

/* ------------------------- Restaurant Section ------------------------- */

const RestaurantSection = ({
  brand,
  list,
  anchorId,
}: {
  brand: string;
  list: RestoProduct[];
  anchorId: string;
}) => {
  const avgPrep = useMemo(() => {
    const prepTimes = list.map((p) => getPrep(p.metadata)).filter((v): v is number => v !== null);
    if (!prepTimes.length) return null;
    return Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length);
  }, [list]);

  const monogram = brand.trim().charAt(0) || "م";

  return (
    <section id={anchorId} className="space-y-3 scroll-mt-20">
      {/* Premium header card */}
      <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5 ring-1 ring-primary/15">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-pill">
          <span className="font-display text-lg font-extrabold">{monogram}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] font-extrabold text-foreground">
            {brand}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-foreground/70">
            {avgPrep !== null && (
              <span className="inline-flex items-center gap-0.5 font-bold">
                <Clock className="h-3 w-3" strokeWidth={2.4} />
                {toLatin(avgPrep)} د متوسط
              </span>
            )}
            <span className="inline-flex h-1 w-1 rounded-full bg-foreground/30" />
            <span className="font-bold">توصيل موحّد</span>
          </div>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-soft">
          {toLatin(list.length)} وجبة
        </span>
      </div>

      {/* Vertical meal list */}
      <div className="flex flex-col space-y-3">
        {list.map((p) => (
          <MealRow key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
};

/* ------------------------------- Page ------------------------------- */

const slug = (s: string) =>
  "rest-" + s.replace(/\s+/g, "-").toLowerCase().slice(0, 40);

const RestaurantsMenuSection = () => {
  const theme = storeThemes.restaurants;
  const [items, setItems] = useState<RestoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchRestaurantAssets();
        if (cancelled) return;
        setItems(rows);
      } catch {
        if (!cancelled) toast.error("تعذّر تحميل المطاعم");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? items.filter(
          (p) => p.name.includes(q) || (p.brand ?? "").includes(q),
        )
      : items;
    const map = new Map<string, RestoProduct[]>();
    for (const p of filtered) {
      const key = p.brand ?? "أخرى";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [items, query]);

  const allBrands = useMemo(
    () => Array.from(new Set(items.map((p) => p.brand ?? "أخرى"))),
    [items],
  );

  const handleJump = (brand: string) => {
    setActiveBrand(brand);
    const el = document.getElementById(slug(brand));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4 pb-12">
      <BackHeader
        title="مجمع المطاعم"
        subtitle="ألذ الوجبات من أفضل مطاعم المدينة"
        accent="مطاعم"
        themeKey="restaurants"
      />

      {/* Hero */}
      <section
        className="rounded-[1.75rem] p-5 shadow-tile"
        style={{ background: theme.gradient }}
      >
        <span className="text-[10px] font-bold text-foreground/80">
          مجمع ذكي · توصيل موحّد
        </span>
        <h2 className="font-display text-2xl font-extrabold text-foreground">
          طعمك المفضّل
        </h2>
        <p className="mt-1 text-xs text-foreground/70">
          اطلب من أكثر من مطعم في نفس السلة — نوصل لباب البيت
        </p>
      </section>

      {/* Search */}
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft">
        <Search
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={2.4}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن وجبة أو مطعم…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Sticky restaurant tabs */}
      {!loading && allBrands.length > 1 && (
        <div
          ref={tabsRef}
          className="sticky top-[60px] z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-md"
        >
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {allBrands.map((b) => {
              const active = activeBrand === b;
              return (
                <button
                  key={b}
                  onClick={() => handleJump(b)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition active:scale-95",
                    active
                      ? "bg-primary text-primary-foreground shadow-pill"
                      : "bg-card text-foreground ring-1 ring-border/60",
                  )}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/40"
            >
              <Skeleton className="h-[100px] w-[100px] rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex justify-between pt-3">
                  <Skeleton className="h-4 w-14" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && grouped.length === 0 && (
        <div className="rounded-[1.75rem] bg-card p-8 text-center shadow-soft ring-1 ring-border/40">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display text-base font-extrabold">
            لا توجد نتائج تطابق بحثك
          </h3>
        </div>
      )}

      {/* Sections */}
      {!loading &&
        grouped.map(([brand, list]) => (
          <RestaurantSection
            key={brand}
            brand={brand}
            list={list}
            anchorId={slug(brand)}
          />
        ))}
    </div>
  );
};

export default RestaurantsMenuSection;
