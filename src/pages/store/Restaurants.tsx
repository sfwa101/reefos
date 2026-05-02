/**
 * Restaurants — live storefront wired to Supabase `products` table.
 * Fetches items where source = 'restaurants' OR fulfillment_type = 'restaurant'
 * and groups them by `brand` (restaurant name). Mobile-first 2-col grid.
 */
import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Plus, Search, Star, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import BackHeader from "@/components/BackHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCartActions, useCartLineQty } from "@/context/CartContext";
import { storeThemes } from "@/lib/storeThemes";
import { toLatin } from "@/lib/format";
import type { Product } from "@/lib/products";

type RestoProduct = {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image: string | null;
  rating: number | null;
  source: string | null;
  fulfillment_type: string | null;
  metadata: Record<string, unknown> | null;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop";

const getPrep = (m: RestoProduct["metadata"]): number | null => {
  if (!m || typeof m !== "object") return null;
  const v = (m as Record<string, unknown>).prepTime;
  return typeof v === "number" ? v : null;
};

const MealCard = ({ p }: { p: RestoProduct }) => {
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
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-card text-right shadow-soft ring-1 ring-border/50">
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <img
          src={p.image ?? FALLBACK_IMG}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {prep !== null && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-extrabold text-background backdrop-blur">
            <Clock className="h-3 w-3" />
            {toLatin(prep)} د
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {p.brand && (
          <p className="line-clamp-1 text-[10px] font-medium text-muted-foreground">
            {p.brand}
          </p>
        )}
        <h3 className="line-clamp-2 text-[13px] font-extrabold leading-tight text-foreground">
          {p.name}
        </h3>
        {p.rating != null && (
          <div className="flex items-center gap-1 text-[10.5px]">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-bold tabular-nums">{toLatin(Number(p.rating))}</span>
          </div>
        )}
        <div className="mt-1 flex items-end justify-between">
          <div className="leading-none">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(Number(p.price).toLocaleString("en-US"))}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
          </div>
          <button
            onClick={handleAdd}
            aria-label="أضف إلى السلة"
            className="flex h-9 items-center gap-1 rounded-full bg-primary px-3 text-[11px] font-extrabold text-primary-foreground shadow-pill transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            {qty === 0 ? "اطلب" : toLatin(qty)}
          </button>
        </div>
      </div>
    </article>
  );
};

const Restaurants = () => {
  const theme = storeThemes.restaurants;
  const [items, setItems] = useState<RestoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,brand,price,image,rating,source,fulfillment_type,metadata",
        )
        .or("source.eq.restaurants,fulfillment_type.eq.restaurant")
        .eq("is_active", true)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) {
        toast.error("تعذّر تحميل المطاعم");
      }
      setItems((data ?? []) as RestoProduct[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim();
    const filtered = q
      ? items.filter(
          (p) =>
            p.name.includes(q) ||
            (p.brand ?? "").includes(q),
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

  const totalRestaurants = useMemo(
    () => new Set(items.map((p) => p.brand ?? "أخرى")).size,
    [items],
  );

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

      {/* Stats bar */}
      <div className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-2.5 ring-1 ring-primary/15">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="flex-1 text-[12px] font-extrabold text-foreground">
          متاح الآن:{" "}
          <span className="text-primary">
            {toLatin(totalRestaurants)} مطعم · {toLatin(items.length)} وجبة
          </span>
        </p>
      </div>

      {/* Search */}
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-soft">
        <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن وجبة أو مطعم…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Grouped by restaurant */}
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

      {!loading &&
        grouped.map(([brand, list]) => (
          <section key={brand} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-base font-extrabold">{brand}</h3>
              <span className="text-[10px] font-bold text-muted-foreground">
                {toLatin(list.length)} وجبة
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {list.map((p) => (
                <MealCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
};

export default Restaurants;
