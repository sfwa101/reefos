import { useParams, Link, useRouter } from "@tanstack/react-router";
import BackHeader from "@/components/BackHeader";
import ProductCard from "@/components/ProductCard";
import { getById } from "@/core/catalog/runtime/legacyRuntime";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { useFavorites } from "@/lib/favorites";
import { Star, Truck, ShieldCheck, Heart, Sparkles } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { fmtMoney, toLatin } from "@/lib/format";
import { listProductReviewsFn, listProductUnitsFn } from "@/core/catalog/catalog.functions";
import { logBehavior } from "@/core/events/behavior";
import { motion } from "framer-motion";
import { trustBadgesFor, chefBlockFor, relatedProductsFor } from "@/core/commerce/knowledge/productEnrichment";
import { extractHandlingTraits, traitLabel } from "@/core/commerce/knowledge/productTraits";
import { villageMetaFor } from "@/core/commerce/knowledge/sourcing-meta";
import ProductGallery from "@/apps/reef-al-madina/features/product-detail/ProductGallery";
import StickyAddCTA from "@/apps/reef-al-madina/features/product-detail/StickyAddCTA";
import {
  VillageStory, VillageStorage, VillageSubscription, VillageNutrition,
} from "@/apps/reef-al-madina/features/product-detail/VillageBlocks";

// Lazy: only loaded for pharmacy products (heaviest block).
const PharmacyMedicalBlock = lazy(() =>
  import("@/apps/reef-al-madina/features/product-detail/PharmacyMedicalBlock"),
);

const ProductDetail = () => {
  const { productId } = useParams({ from: "/_app/product/$productId" });
  const product = getById(productId);
  const router = useRouter();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const { has, toggle } = useFavorites();
  const fav = product ? has(product.id) : false;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  type PUnit = { id: string; unit_code: string; conversion_factor: number; selling_price: number | null; is_default_sell: boolean };
  const [productUnits, setProductUnits] = useState<PUnit[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [priceFlash, setPriceFlash] = useState(0);
  const [subMode, setSubMode] = useState(false);
  const [addBurst, setAddBurst] = useState(false);

  useEffect(() => {
    if (product?.variants?.length) {
      const def = product.variants.find((v) => v.priceDelta === 0) ?? product.variants[0];
      setVariantId(def.id);
    } else {
      setVariantId(null);
    }
    setAddonIds([]);
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    void logBehavior({ event: "view_product", productId: product.id, category: product.category });
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    (async () => {
      const [{ count }, units] = await Promise.all([
        listProductReviewsFn({ data: { productId: product.id } }),
        listProductUnitsFn({ data: { productId: product.id } }),
      ]);
      if (cancelled) return;
      setReviewCount(count ?? 0);
      const list = (units || []) as PUnit[];
      setProductUnits(list);
      if (list.length > 0) {
        const def = list.find((u) => u.is_default_sell) || list[0];
        setUnitId(def.id);
      } else {
        setUnitId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [product?.id]);

  const selectedUnit = productUnits.find((u) => u.id === unitId);
  const variant = product?.variants?.find((v) => v.id === variantId);
  const addonsTotal = useMemo(
    () => (product?.addons ?? []).filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + a.price, 0),
    [product?.addons, addonIds],
  );
  const baseUnitPrice = (product?.price ?? 0) + (variant?.priceDelta ?? 0) + addonsTotal;
  const unitPrice = selectedUnit?.selling_price != null
    ? Number(selectedUnit.selling_price) + (variant?.priceDelta ?? 0) + addonsTotal
    : selectedUnit
      ? baseUnitPrice * selectedUnit.conversion_factor
      : baseUnitPrice;
  const total = speculativeLineTotal(unitPrice, qty);

  useEffect(() => {
    setPriceFlash((x) => x + 1);
  }, [variantId, addonIds.join(","), qty]);

  if (!product) {
    return (
      <div>
        <BackHeader title="المنتج غير موجود" />
        <p className="text-sm text-muted-foreground">لم يتم العثور على المنتج المطلوب.</p>
        <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">العودة للرئيسية</Link>
      </div>
    );
  }

  const badges = trustBadgesFor(product);
  const chef = chefBlockFor(product);
  const related = relatedProductsFor(product, 4);
  const village = villageMetaFor(product.id);
  const isVillage = !!village;
  const isPharmacy = product.source === "pharmacy";
  const meta = (product.metadata ?? {}) as Record<string, any>;
  const gallery = [product.image, product.image, product.image];

  const toggleAddon = (id: string) =>
    setAddonIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleAdd = () => {
    const variantSuffix = variant ? ` (${variant.label})` : "";
    const addonLabels = (product.addons ?? []).filter((a) => addonIds.includes(a.id)).map((a) => a.label);
    const subSuffix = subMode ? " (اشتراك أسبوعي)" : "";
    const suffix = variantSuffix + (addonLabels.length ? ` + ${addonLabels.join(" + ")}` : "") + subSuffix;
    const customId = `${product.id}${variant ? `__${variant.id}` : ""}${addonIds.length ? `__${addonIds.sort().join("-")}` : ""}${subMode ? "__sub" : ""}`;
    const finalPrice = subMode && village?.routine
      ? Math.round(unitPrice * (1 - village.routine.discountPct / 100))
      : unitPrice;
    add({ ...product, id: customId, name: `${product.name}${suffix}`, price: finalPrice }, qty);
    setAddBurst(true);
    window.setTimeout(() => setAddBurst(false), 900);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* ignore */ }
  };

  const displayTotal = isVillage && subMode && village?.routine
    ? Math.round(total * (1 - village.routine.discountPct / 100))
    : total;
  const ctaLabel = isVillage && subMode ? "اشترك واحجز حصتك" : "أضف للسلة";

  return (
    <>
      <motion.div
        className={isVillage ? "" : "space-y-5"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {!isVillage && <BackHeader title={product.category} />}

        <ProductGallery
          images={gallery}
          productName={product.name}
          productId={product.id}
          isVillage={isVillage}
          fav={fav}
          toggleFav={toggle}
          onBack={() => router.history.back()}
          onShare={handleShare}
        />

        <div className={isVillage ? "mt-5 space-y-5" : ""}>
          {/* ===== Title + Trust Badges ===== */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {product.brand && (
                  <Link
                    to="/search"
                    search={{ q: product.brand, brand: product.brand }}
                    className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-extrabold text-primary ring-1 ring-primary/20 transition active:scale-95"
                    aria-label={`عرض كل منتجات ${product.brand}`}
                  >
                    {product.brand}
                  </Link>
                )}
                <h1 className="font-display text-2xl font-extrabold leading-tight">{product.name}</h1>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
              </div>
              {!isVillage && (
                <button
                  onClick={() => toggle(product.id)}
                  className="glass-strong flex h-10 w-10 items-center justify-center rounded-full shadow-soft transition active:scale-90"
                  aria-label="مفضلة"
                >
                  <Heart className={`h-4 w-4 transition ${fav ? "fill-destructive text-destructive" : ""}`} strokeWidth={2} />
                </button>
              )}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-soft/70 px-2.5 py-1 text-[10.5px] font-extrabold text-primary ring-1 ring-primary/15"
                  >
                    <span aria-hidden className="text-[12px] leading-none">{b.emoji}</span>
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            {(() => {
              const traits = extractHandlingTraits(product.metadata);
              if (traits.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1.5">
                  {traits.map((t) => (
                    <Link
                      key={t}
                      to="/search"
                      search={{ q: t, trait: t }}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-extrabold text-accent-foreground ring-1 ring-accent/30 transition active:scale-95"
                      aria-label={`عرض كل المنتجات ${traitLabel(t)}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {traitLabel(t)}
                    </Link>
                  ))}
                </div>
              );
            })()}

            {product.rating && (
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 font-bold text-accent-foreground">
                  <Star className="h-3 w-3 fill-accent text-accent" strokeWidth={0} />
                  {product.rating}
                </span>
                <span className="text-muted-foreground tabular-nums">{toLatin(reviewCount ?? 0)} تقييم</span>
              </div>
            )}
          </section>

          {isPharmacy && (
            <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-foreground/5" />}>
              <PharmacyMedicalBlock meta={meta} productName={product.name} />
            </Suspense>
          )}

          {/* ===== Unit picker (multi-unit products) ===== */}
          {productUnits.length > 0 && (
            <section className="space-y-2">
              <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                اختر الوحدة
              </p>
              <div className="grid grid-cols-2 gap-2">
                {productUnits.map((u) => {
                  const active = u.id === unitId;
                  const price = u.selling_price != null
                    ? Number(u.selling_price)
                    : (product?.price ?? 0) * u.conversion_factor;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setUnitId(u.id)}
                      className={`rounded-2xl p-3 text-right transition active:scale-[0.98] ${
                        active
                          ? "bg-primary text-primary-foreground ring-2 ring-primary"
                          : "bg-surface ring-1 ring-border/40"
                      }`}
                    >
                      <p className="text-[13px] font-extrabold">{u.unit_code}</p>
                      <p className={`text-[10px] ${active ? "opacity-90" : "text-muted-foreground"}`}>
                        = {toLatin(u.conversion_factor)} قطعة
                      </p>
                      <p className="mt-1 font-display text-sm font-extrabold tabular-nums">
                        {toLatin(Math.round(price))} ج.م
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {isVillage && village && (
            <>
              <VillageStory village={village} />
              <VillageStorage village={village} />
              <VillageSubscription
                village={village}
                unitPrice={unitPrice}
                subMode={subMode}
                setSubMode={setSubMode}
              />
              <VillageNutrition village={village} />
            </>
          )}

          {/* ===== Variants (dynamic) ===== */}
          {product.variants && product.variants.length > 0 && (
            <section className="glass-strong rounded-2xl p-4 shadow-soft">
              <p className="mb-2 text-xs font-bold text-muted-foreground">الحجم / الوزن</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const active = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                        active ? "bg-primary text-primary-foreground shadow-pill" : "bg-foreground/5"
                      }`}
                    >
                      {v.label}
                      {v.priceDelta !== 0 && (
                        <span className="ms-1 opacity-70 tabular-nums">
                          {v.priceDelta > 0 ? `+${v.priceDelta}` : v.priceDelta}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== Addons ===== */}
          {product.addons && product.addons.length > 0 && (
            <section className="glass-strong rounded-2xl p-4 shadow-soft">
              <p className="mb-2 text-xs font-bold text-muted-foreground">إضافات اختيارية</p>
              <div className="space-y-2">
                {product.addons.map((a) => {
                  const active = addonIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAddon(a.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${
                        active ? "border-primary bg-primary-soft" : "border-border"
                      }`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                        active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      }`}>
                        {active && <span className="text-[10px]">✓</span>}
                      </div>
                      <p className="flex-1 text-sm font-bold">{a.label}</p>
                      <span className="font-display text-sm font-extrabold text-primary tabular-nums">
                        +{fmtMoney(a.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== Trust strip ===== */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass flex items-center gap-2 rounded-2xl p-3 shadow-soft">
              <Truck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-[11px] font-bold">توصيل سريع</p>
                <p className="text-[10px] text-muted-foreground">خلال ساعتين</p>
              </div>
            </div>
            <div className="glass flex items-center gap-2 rounded-2xl p-3 shadow-soft">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-[11px] font-bold">جودة مضمونة</p>
                <p className="text-[10px] text-muted-foreground">استبدال فوري</p>
              </div>
            </div>
          </div>

          {chef && (
            <section
              className="rounded-2xl p-4 shadow-soft ring-1 ring-primary/10"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary-soft) / 0.6), hsl(var(--secondary) / 0.4))",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl" aria-hidden>{chef.emoji}</span>
                <h3 className="font-display text-base font-extrabold text-foreground">{chef.title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/80">{chef.body}</p>
            </section>
          )}

          <section className="glass-strong rounded-2xl p-4 shadow-soft">
            <h3 className="mb-2 font-display text-base font-extrabold">عن المنتج</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              منتج مختار بعناية من أجود المصادر، يصلك بنفس اليوم مع ضمان الاستبدال الفوري.
            </p>
          </section>

          {related.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between px-1">
                <div>
                  <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    <Sparkles className="h-3 w-3" strokeWidth={2.6} />
                    مقترح ذكي
                  </span>
                  <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">
                    يكمل تجربتك
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    منتجات اختارها لك الذكاء الاصطناعي لتكمّل سلتك
                  </p>
                </div>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
                {related.map((p) => (
                  <div key={p.id} className="snap-start">
                    <ProductCard product={p} variant="carousel" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="h-28" />
        </div>
      </motion.div>

      <StickyAddCTA
        qty={qty}
        setQty={setQty}
        total={total}
        displayTotal={displayTotal}
        priceFlash={priceFlash}
        addBurst={addBurst}
        onAdd={handleAdd}
        ctaLabel={ctaLabel}
      />
    </>
  );
};

export default ProductDetail;
