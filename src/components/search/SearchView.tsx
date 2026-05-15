import { useSearch, useNavigate, Link } from "@tanstack/react-router";
import {
  Search as SearchIcon,
  X,
  PackageSearch,
  SlidersHorizontal,
  ArrowUpDown,
  Star,
  CheckCircle2,
  ScanBarcode,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Product } from "@/core/catalog/legacyProduct.types";
import ProductCard from "@/components/ProductCard";
import { toLatin } from "@/lib/format";
import { useUniversalSearch, useSearchHistory } from "@/modules/search";
import { useFeaturedCategoriesQuery } from "@/hooks/useFeaturedCategories";
import { searchSovereignAssets, assetToProduct } from "@/core/commerce/knowledge/sovereignCatalog";
import { extractHandlingTraits, traitLabel } from "@/core/commerce/knowledge/productTraits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Live Sovereign search — merges with in-memory `products`.
// Returns DB-only matches (cached products are skipped to avoid dupes).
function useSupabaseProductSearch(term: string, knownIds: Set<string>) {
  const [remote, setRemote] = useState<Product[]>([]);
  useEffect(() => {
    const t = term.trim();
    if (t.length < 2) { setRemote([]); return; }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const rows = await searchSovereignAssets({ q: t, limit: 40 });
        if (cancelled) return;
        const mapped = rows
          .map(assetToProduct)
          .filter((p): p is Product => p != null);
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
  const { q, brand, trait } = useSearch({ from: "/_app/search" });
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
      navigate({
        to: "/search",
        search: (prev) => ({ ...prev, q: inputVal }),
        replace: true,
      });
      setIsDebouncing(false);
    }, 220);
    return () => clearTimeout(t);
  }, [inputVal, q, navigate]);

  const setQuery = (val: string) => setInputVal(val);

  const clearBrand = () =>
    navigate({ to: "/search", search: (prev) => ({ ...prev, q: prev.q ?? "", brand: undefined }), replace: true });
  const clearTrait = () =>
    navigate({ to: "/search", search: (prev) => ({ ...prev, q: prev.q ?? "", trait: undefined }), replace: true });

  // Search history (recent queries) + featured categories (trending grid)
  const { history, push: pushHistory, remove: removeHistory, clear: clearHistory } = useSearchHistory();
  const { data: featuredCats = [] } = useFeaturedCategoriesQuery();

  // Persist successful searches (debounced via the URL `q` write above).
  useEffect(() => {
    const term = q.trim();
    if (term.length >= 2) pushHistory(term);
  }, [q, pushHistory]);

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
  const { hits, products: serverProducts } = useUniversalSearch(q);

  const localMatches = useMemo<Product[]>(() => {
    if (!q.trim()) return [];
    const byId = new Map(serverProducts.map((p) => [p.id, p] as const));
    const out: Product[] = [];
    for (const h of hits) {
      if (h.kind !== "product") continue;
      const full = byId.get(h.rawId);
      if (full) out.push(full);
    }
    return out;
  }, [q, hits, serverProducts]);

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
    if (brand) {
      const b = brand.toLowerCase();
      list = list.filter((p) => (p.brand ?? "").toLowerCase() === b);
    }
    if (trait) {
      const t = trait.toLowerCase();
      list = list.filter((p) =>
        extractHandlingTraits(p.metadata).some((x) => x.toLowerCase() === t),
      );
    }
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
  }, [matches, brand, trait, activeCat, sort, maxPrice, priceCeiling]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [filtered]);

  const total = filtered.length;
  const filtersActive =
    activeCat !== "all" || sort !== "relevance" || (priceCeiling && maxPrice < priceCeiling);

  return (
    <div className="pb-24" dir="rtl">
      {/* Sticky glass header — sits flush under the fixed TopBar (h-14). */}
      <div className="sticky top-14 z-40 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-secondary/70 px-3 ring-1 ring-border/50 focus-within:ring-2 focus-within:ring-primary/40">
            <SearchIcon
              className={`h-4 w-4 ${isDebouncing ? "animate-pulse text-primary" : "text-muted-foreground"}`}
              strokeWidth={2.2}
            />
            <Input
              autoFocus
              value={inputVal}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج، علامة، قسم…"
              className="flex-1 bg-transparent text-[13.5px] font-medium outline-none placeholder:text-muted-foreground"
              dir="rtl"
            />
            {inputVal && (
              <Button variant="ghost"
                onClick={() => setQuery("")}
                aria-label="مسح"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 text-foreground/70 transition active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button variant="ghost"
            type="button"
            aria-label="مسح باركود"
            onClick={() => window.dispatchEvent(new CustomEvent("reef:open-barcode"))}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition active:scale-95"
          >
            <ScanBarcode className="h-5 w-5" strokeWidth={2.2} />
          </Button>
          {q && matches.length > 0 && (
            <Button variant="ghost"
              onClick={() => setFiltersOpen(true)}
              aria-label="تصفية"
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                filtersActive ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
        {q && (
          <p className="mt-2 px-1 text-[11px] font-bold text-muted-foreground">
            {toLatin(total)} نتيجة لـ <span className="text-foreground">"{q}"</span>
          </p>
        )}
        {(brand || trait) && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-1">
            {brand && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold text-primary ring-1 ring-primary/20">
                علامة: {brand}
                <Button variant="ghost" onClick={clearBrand} aria-label="إزالة فلتر العلامة" className="opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
            {trait && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground ring-1 ring-accent/30">
                نمط: {traitLabel(trait)}
                <Button variant="ghost" onClick={clearTrait} aria-label="إزالة فلتر النمط" className="opacity-70 hover:opacity-100">
                  <X className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-5">
        {!q && (
          <>
            {history.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <h2 className="font-display text-[13px] font-extrabold text-foreground">
                      عمليات بحث سابقة
                    </h2>
                  </div>
                  <Button variant="ghost"
                    onClick={clearHistory}
                    className="text-[11px] font-extrabold text-primary active:opacity-70"
                  >
                    مسح الكل
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <span
                      key={h}
                      className="group inline-flex items-center gap-1 rounded-full bg-foreground/5 ps-1 pe-3 text-[12px] font-bold text-foreground ring-1 ring-border/40"
                    >
                      <Button variant="ghost"
                        onClick={() => removeHistory(h)}
                        aria-label={`حذف ${h}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground active:bg-foreground/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" onClick={() => setQuery(h)} className="py-1.5">
                        {h}
                      </Button>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <h2 className="font-display text-[13px] font-extrabold text-foreground">
                  اقتراحات شائعة
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["دجاج", "حليب", "أرز", "خضار", "زيت زيتون", "عصير", "قهوة", "طماطم"].map((s) => (
                  <Button variant="ghost"
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full bg-primary/8 px-4 py-2 text-[12px] font-bold text-foreground ring-1 ring-primary/20 transition active:scale-[0.97]"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </section>

            {featuredCats.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <h2 className="font-display text-[13px] font-extrabold text-foreground">
                    اكتشف الآن
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {featuredCats.slice(0, 9).map((c) => (
                    <Link
                      key={c.id}
                      to={c.to}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-border/50 transition active:scale-[0.97]"
                    >
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-sm"
                        style={{
                          background: `conic-gradient(from 180deg, hsl(${c.ringFrom}), hsl(${c.ringTo}))`,
                        }}
                      >
                        <span aria-hidden>{c.emoji}</span>
                      </div>
                      <p className="line-clamp-1 text-center text-[11px] font-extrabold text-foreground">
                        {c.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      {/* Category pills */}
      {q && categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button variant="ghost"
            onClick={() => setActiveCat("all")}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold ${
              activeCat === "all" ? "bg-foreground text-background" : "bg-foreground/5 text-foreground"
            }`}
          >
            الكل ({toLatin(matches.length)})
          </Button>
          {categories.map(([cat, count]) => (
            <Button variant="ghost"
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold ${
                activeCat === cat ? "bg-foreground text-background" : "bg-foreground/5 text-foreground"
              }`}
            >
              {cat} ({toLatin(count)})
            </Button>
          ))}
        </div>
      )}

      {/* Active sort indicator */}
      {q && sort !== "relevance" && (
        <div className="flex justify-end px-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10.5px] font-extrabold text-primary">
            <ArrowUpDown className="h-3 w-3" />
            {SORTS.find((s) => s.id === sort)?.label}
            <Button variant="ghost" onClick={() => setSort("relevance")} aria-label="إلغاء">
              <X className="h-3 w-3" />
            </Button>
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
      </div>

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
              <Button variant="ghost"
                onClick={() => setFiltersOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </Button>
              <h2 className="font-display text-lg font-extrabold">تصفية النتائج</h2>
              <Button variant="ghost"
                onClick={() => {
                  setActiveCat("all");
                  setSort("relevance");
                  setMaxPrice(priceCeiling);
                }}
                className="text-[11px] font-extrabold text-primary"
              >
                مسح
              </Button>
            </div>

            <p className="text-[11px] font-extrabold text-foreground/70">الفرز</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {SORTS.map((s) => {
                const active = sort === s.id;
                return (
                  <Button variant="ghost"
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
                  </Button>
                );
              })}
            </div>

            {priceCeiling > 0 && (
              <>
                <p className="mt-4 text-[11px] font-extrabold text-foreground/70">
                  الحد الأقصى للسعر: {toLatin(maxPrice.toLocaleString("en-US"))} ج.م
                </p>
                <Input
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

            <Button variant="ghost"
              onClick={() => setFiltersOpen(false)}
              className="mt-5 h-12 w-full rounded-2xl bg-foreground text-[13px] font-extrabold text-background shadow-pill"
            >
              عرض {toLatin(total)} نتيجة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
