import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import { Search as SearchIcon, X, PackageSearch, SlidersHorizontal, ArrowUpDown, Star, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { products, useProducts, useProductsVersion, type Product } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import BackHeader from "@/components/BackHeader";
import { toLatin } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useUniversalSearch } from "@/modules/search";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3C/svg%3E";

// Live Supabase search — merges with the local in-memory `products` array.
// Returns DB-only matches (already-cached products are skipped to avoid dupes).
function useSupabaseProductSearch(term: string, knownIds: Set<string>) {
  const [remote, setRemote] = useState<Product[]>([]);
  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) { setRemote([]); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const like = `%${t}%`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("products")
          .select("id,name,brand,unit,price,old_price,image,image_url,rating,category,sub_category,source,badge")
          .eq("is_active", true)
          .or(`name.ilike.${like},brand.ilike.${like},category.ilike.${like},sub_category.ilike.${like}`)
          .limit(40);
        if (cancelled) return;
        if (error) { setRemote([]); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Product[] = (data ?? []).map((r: any) => ({
          id: String(r.id),
          name: r.name,
          brand: r.brand ?? undefined,
          unit: r.unit ?? "",
          price: Number(r.price ?? 0),
          oldPrice: r.old_price != null ? Number(r.old_price) : undefined,
          image: r.image_url || r.image || FALLBACK_IMG,
          rating: r.rating != null ? Number(r.rating) : undefined,
          category: r.category ?? "",
          subCategory: r.sub_category ?? undefined,
          source: (r.source as Product["source"]) ?? "supermarket",
          badge: (r.badge as Product["badge"]) ?? undefined,
        }));
        setRemote(mapped.filter((p) => !knownIds.has(p.id)));
      } catch {
        if (!cancelled) setRemote([]);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [term, knownIds]);
  return remote;
}

type SortId = "relevance" | "price-asc" | "price-desc" | "rating";

const SORTS: { id: SortId; label: string }[] = [
  { id: "relevance", label: "الأنسب" },
  { id: "price-asc", label: "السعر: الأقل أولًا" },
  { id: "price-desc", label: "السعر: الأعلى أولًا" },
  { id: "rating", label: "الأعلى تقييمًا" },
];

const SearchPage = () => {
  const _pv = useProductsVersion();
  const { q } = useSearch({ from: "/_app/search" });
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortId>("relevance");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(0);

  // Local input mirrors URL `q` but debounces URL writes to avoid history thrash.
  const [inputVal, setInputVal] = useState(q ?? "");
  const [isDebouncing, setIsDebouncing] = useState(false);
  useEffect(() => { setInputVal(q ?? ""); }, [q]);
  useEffect(() => {
    if (inputVal === q) { setIsDebouncing(false); return; }
    setIsDebouncing(true);
    const t = setTimeout(() => {
      navigate({ to: "/search", search: { q: inputVal }, replace: true });
      setIsDebouncing(false);
    }, 220);
    return () => clearTimeout(t);
  }, [inputVal, q, navigate]);

  const setQuery = (val: string) => setInputVal(val);

  // ─── BRAIN TRANSPLANT ────────────────────────────────────────────────
  // Phase 11.6: drop the naive `name/category/brand/subCategory` substring
  // filter and delegate to `useUniversalSearch`. That hook owns:
  //   • Arabic normalization (alef/ya/ta-marbuta unification, diacritics)
  //   • Bidirectional alias dictionary ("بندورة" ⇄ "طماطم", …)
  //   • `metadata.aliases` extraction (SEED-time enrichment, per-product)
  //   • MiniSearch fuzzy + prefix scoring
  // We then map the product hits back to full `Product` objects via the
  // in-memory cache so the rest of the page (filters, sort, group-by-cat,
  // ProductCard rendering) keeps its existing contract unchanged.
  const { products: catalog } = useProducts();
  const { hits } = useUniversalSearch(q);

  const localMatches = useMemo<Product[]>(() => {
    if (!q.trim()) return [];
    const byId = new Map(catalog.map((p) => [p.id, p] as const));
    const out: Product[] = [];
    for (const h of hits) {
      if (h.kind !== "product") continue;
      const full = byId.get(h.rawId);
      if (full) out.push(full);
    }
    return out;
    // `_pv` triggers re-eval whenever the global products cache mutates.
  }, [q, hits, catalog, _pv]);

  // Pull additional results from Supabase (server-side products that may not
  // be in the in-memory `products` cache yet). De-duplicated by id.
  const knownIds = useMemo(() => new Set(localMatches.map((p) => p.id)), [localMatches]);
  const remoteMatches = useSupabaseProductSearch(q, knownIds);
  const matches = useMemo(
    () => [...localMatches, ...remoteMatches],
    [localMatches, remoteMatches],
  );

  const priceCeiling = useMemo(
    () => (matches.length ? Math.max(...matches.map((p) => p.price)) : 0),
    [matches],
  );

  useEffect(() => {
    if (priceCeiling) setMaxPrice(priceCeiling);
  }, [priceCeiling]);

  const categories = useMemo(() => {
    const set = new Map<string, number>();
    matches.forEach((p) => set.set(p.category, (set.get(p.category) ?? 0) + 1));
    return Array.from(set.entries());
  }, [matches]);

  const filtered = useMemo(() => {
    let list = matches;
    if (activeCat !== "all") list = list.filter((p) => p.category === activeCat);
    if (maxPrice && maxPrice < priceCeiling)
      list = list.filter((p) => p.price <= maxPrice);
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
    }
    return list;
  }, [matches, activeCat, sort, maxPrice, priceCeiling]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof products>();
    for (const p of filtered) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [filtered, _pv]);

  const total = filtered.length;
  const filtersActive =
    activeCat !== "all" || sort !== "relevance" || (priceCeiling && maxPrice < priceCeiling);

  return (
    <div className="space-y-5 pb-24">
      <BackHeader title="ابحث" subtitle={q ? `${toLatin(total)} نتيجة` : "اكتب اسم منتج أو قسم"} />

      <div className="glass-strong sticky top-2 z-10 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-soft">
        <SearchIcon className={`h-4 w-4 ${isDebouncing ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
        <input
          autoFocus
          value={inputVal}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج، علامة، قسم…"
          className="flex-1 bg-transparent text-sm outline-none"
          dir="rtl"
        />
        {inputVal && (
          <button onClick={() => setQuery("")} aria-label="مسح" className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {q && matches.length > 0 && (
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label="تصفية"
            className={`relative flex h-8 items-center gap-1 rounded-full px-3 text-[11px] font-extrabold ${
              filtersActive ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            تصفية
          </button>
        )}
      </div>

      {!q && (
        <div className="space-y-3">
          <p className="px-1 text-xs font-bold text-muted-foreground">اقتراحات شائعة</p>
          <div className="flex flex-wrap gap-2">
            {["دجاج", "حليب", "أرز", "خضار", "زيت زيتون", "عصير", "قهوة", "أدوات منزلية"].map((s) => (
              <button key={s} onClick={() => setQuery(s)} className="rounded-full bg-foreground/5 px-4 py-2 text-xs font-bold">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category pills */}
      {q && categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setActiveCat("all")}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold ${
              activeCat === "all" ? "bg-foreground text-background" : "bg-foreground/5 text-foreground"
            }`}
          >
            الكل ({toLatin(matches.length)})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold ${
                activeCat === cat ? "bg-foreground text-background" : "bg-foreground/5 text-foreground"
              }`}
            >
              {cat} ({toLatin(count)})
            </button>
          ))}
        </div>
      )}

      {/* Active sort indicator */}
      {q && sort !== "relevance" && (
        <div className="flex justify-end px-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10.5px] font-extrabold text-primary">
            <ArrowUpDown className="h-3 w-3" />
            {SORTS.find((s) => s.id === sort)?.label}
            <button onClick={() => setSort("relevance")} aria-label="إلغاء">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {q && total === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
            <PackageSearch className="h-10 w-10 text-primary" strokeWidth={2} />
          </div>
          <h2 className="font-display text-xl font-extrabold">لا نتائج</h2>
          <p className="text-sm text-muted-foreground">جرّب كلمة بحث أخرى أو تصفّح الأقسام</p>
          <Link to="/sections" className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pill">تصفّح الأقسام</Link>
        </div>
      )}

      {grouped.map((g) => (
        <section key={g.category}>
          <h3 className="mb-3 px-1 font-display text-base font-extrabold">{g.category}</h3>
          <div className="grid grid-cols-2 gap-3">
            {g.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      {/* Filters sheet */}
      {filtersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-end bg-black/55 backdrop-blur-sm"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-md rounded-t-[28px] bg-background p-4 shadow-2xl ring-1 ring-border/60 animate-in slide-in-from-bottom-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="font-display text-lg font-extrabold">تصفية النتائج</h2>
              <button
                onClick={() => {
                  setActiveCat("all");
                  setSort("relevance");
                  setMaxPrice(priceCeiling);
                }}
                className="text-[11px] font-extrabold text-primary"
              >
                مسح
              </button>
            </div>

            <p className="text-[11px] font-extrabold text-foreground/70">الفرز</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {SORTS.map((s) => {
                const active = sort === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSort(s.id)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] font-extrabold ${
                      active
                        ? "bg-primary text-primary-foreground shadow-pill"
                        : "bg-card text-foreground ring-1 ring-border/60"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {s.id === "rating" && <Star className="h-3.5 w-3.5" />}
                      {s.label}
                    </span>
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            {priceCeiling > 0 && (
              <>
                <p className="mt-4 text-[11px] font-extrabold text-foreground/70">
                  الحد الأقصى للسعر: {toLatin(maxPrice.toLocaleString("en-US"))} ج.م
                </p>
                <input
                  type="range"
                  min={1}
                  max={priceCeiling}
                  step={Math.max(1, Math.round(priceCeiling / 100))}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </>
            )}

            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-5 h-12 w-full rounded-2xl bg-foreground text-[13px] font-extrabold text-background shadow-pill"
            >
              عرض {toLatin(total)} نتيجة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
