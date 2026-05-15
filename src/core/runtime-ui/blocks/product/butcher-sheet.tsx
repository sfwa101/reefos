import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Star, Clock, MessageSquare, ShoppingBag, Flame, ChevronLeft, Check, Plus,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import { fireMiniConfetti } from "@/lib/confetti";
import type { Product } from "@/core/catalog/legacyProduct.types";
import {
  getButcheryRules, computeButcheryPrice, slaForPrep, slaMeta,
  type PrepOption, type WeightOption,
} from "@/core/commerce/variants/weighed-prep-rules";
import { butcheryToModifiers } from "@/lib/pricingAdapters";
import { AnimatedNumber, Panel } from "@/apps/reef-al-madina/features/weighed-prep/components/Panel";
import { CutBuilder } from "@/apps/reef-al-madina/features/weighed-prep/components/CutBuilder";
import { PrepOptions } from "@/apps/reef-al-madina/features/weighed-prep/components/PrepOptions";
import { useLivePrice } from "@/core/commerce/pricing/hooks/useLivePrice";
import type { WeighedSelection } from "@/core/commerce/pricing/strategies/WeighedPricingStrategy";

type Props = { product: Product; open: boolean; onClose: () => void };

/**
 * Orchestrator for the butcher product modal. Owns:
 *   - prep/weight/addons/packaging/cross-sell/qty/note state
 *   - dynamic SLA tier derived from selected prep
 *   - all pricing math (delegated to lib/butcheryPrep.computeButcheryPrice)
 * Pure UI for weight + prep/addons/packaging is delegated to feature/meat/*.
 */
const ButcherSheet = ({ product, open, onClose }: Props) => {
  const { add } = useCart();
  const navigate = useNavigate();
  const rules = useMemo(() => getButcheryRules(product), [product]);

  // All hooks must run unconditionally — keep refs even when rules is null.
  const weights: WeightOption[] = rules?.weights ?? [];
  const preps: PrepOption[] = rules?.preps ?? [];

  const [weightId, setWeightId] = useState<string>(weights[1]?.id ?? weights[0]?.id ?? "");
  const [prepId, setPrepId] = useState<string>(preps[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [packagingId, setPackagingId] = useState<string>(rules?.packaging[0]?.id ?? "normal");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [crossIds, setCrossIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !rules) return;
    setWeightId(rules.weights[1]?.id ?? rules.weights[0]?.id ?? "");
    setPrepId(rules.preps[0]?.id ?? "");
    setAddonIds([]);
    setPackagingId(rules.packaging[0]?.id ?? "normal");
    setQty(1);
    setNote("");
    setCrossIds([]);
  }, [open, product.id, rules]);

  // Disabled addons removed automatically when prep changes
  useEffect(() => {
    const p = rules?.preps.find((x) => x.id === prepId);
    if (!p?.disables?.length) return;
    setAddonIds((prev) => prev.filter((id) => !p.disables!.includes(id)));
  }, [prepId, rules]);

  if (!rules) return null;

  const weight = rules.weights.find((w) => w.id === weightId) ?? rules.weights[0];
  const prep = rules.preps.find((p) => p.id === prepId) ?? rules.preps[0];
  const sla = slaForPrep(prep);
  const slaInfo = slaMeta[sla];

  const visibleAddons = rules.addons.filter((a) => {
    if (prep.disables?.includes(a.id)) return false;
    if (a.conditional && !prep.reveals?.includes(a.id)) return false;
    return true;
  });

  // ── Live Pricing Integration (Phase 5.1) ───────────────────────
  // Build a stable WeighedSelection that mirrors the engine contract.
  const liveSelection = useMemo<WeighedSelection | null>(() => {
    if (!weight || !prep) return null;
    return {
      quantity: qty,
      weight,
      prep,
      addonIds,
      packagingId,
      crossSellIds: crossIds,
    };
  }, [qty, weight, prep, addonIds, packagingId, crossIds]);

  const { supported, breakdown } = useLivePrice<WeighedSelection>(
    product,
    liveSelection,
    { zoneAcceptsPerishables: true, customerTier: "bronze" },
    { strategyKey: "meat" },
  );

  // Legacy fallback math — used only if engine is unavailable for safety.
  const legacyUnit = computeButcheryPrice(
    product.price, weight, prep, addonIds, rules, packagingId,
  );
  const legacyLine = legacyUnit * qty;
  const legacyCross = rules.crossSell
    .filter((c) => crossIds.includes(c.id))
    .reduce((s, c) => s + c.price, 0);

  // Prefer the engine; fall back to legacy if unsupported / errored.
  const useEngine = supported && breakdown !== null;
  const unitPrice = useEngine ? breakdown.unitPrice : legacyUnit;
  const lineTotal = useEngine ? breakdown.lineTotal : legacyLine;
  const crossTotal = useEngine ? breakdown.crossSellTotal : legacyCross;
  const feeTotal = useEngine ? breakdown.feeTotal : 0;
  const discountTotal = useEngine ? breakdown.discountTotal : 0;
  const grand = useEngine ? breakdown.grandTotal : legacyLine + legacyCross;

  const toggle = (id: string, list: string[], set: (x: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const confirm = () => {
    // Phase 5.2 — prefer engine-emitted modifiers; fall back to legacy adapter.
    const engineModifiers =
      useEngine && breakdown
        ? breakdown.appliedModifiers.map((m) => ({
            id: m.id,
            label: m.label,
            kind: m.kind,
            amount: m.amount,
            percent: m.percent,
            meta: m.meta ? { ...m.meta } : undefined,
          }))
        : null;

    add(product, qty, {
      variantId: weight.id,
      addonIds: addonIds.length ? addonIds : undefined,
      unitPrice,
      // Universal Commerce Engine — Phase 5.2 hydration.
      appliedModifiers:
        engineModifiers ??
        butcheryToModifiers(weight, prep, addonIds, rules, packagingId),
      properties: liveSelection
        ? {
            selection: liveSelection,
            strategyKey: "meat",
            engineDriven: engineModifiers !== null,
          }
        : undefined,
      bookingNote: [
        `الوزن: ${weight.label}`,
        `التحضير: ${prep.label}`,
        `التغليف: ${rules.packaging.find((p) => p.id === packagingId)?.label}`,
        note.trim() ? `ملاحظة: ${note.trim()}` : "",
      ].filter(Boolean).join(" · "),
    });
    if (crossIds.length) {
      toast.success(`تمت إضافة ${toLatin(crossIds.length)} منتج مكمّل`);
    }
    fireMiniConfetti();
    toast.success(`${product.name} — ${prep.label} · ${slaInfo.label}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-card shadow-float ring-2 ${slaInfo.ringClass} transition-all duration-300 sm:rounded-[28px]`}
          >
            {/* Hero */}
            <div className="relative h-44 w-full overflow-hidden">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              <button
                onClick={onClose}
                aria-label="إغلاق"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-pill"
              >
                <X className="h-4 w-4" />
              </button>
              <motion.span
                key={sla}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 18, stiffness: 320 }}
                className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${slaInfo.bgClass} ${slaInfo.textClass} shadow-pill ring-1 ${slaInfo.ringClass}`}
              >
                <Clock className="h-3 w-3" /> {slaInfo.emoji} {slaInfo.label}
              </motion.span>
              <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">{product.name}</h2>
                  <p className="text-[11px] text-muted-foreground">{product.unit} · {toLatin(product.price)} ج.م للكيلو</p>
                </div>
                {product.rating && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-extrabold text-background">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {toLatin(product.rating)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 p-4">
              {/* Educational facts */}
              <div className="flex flex-wrap gap-1.5">
                {rules.facts.map((f) => (
                  <span key={f} className="rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-bold text-foreground">
                    {f}
                  </span>
                ))}
              </div>

              {/* SLA message strip */}
              <motion.div
                key={`msg-${sla}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2 rounded-2xl p-3 text-[11.5px] font-bold leading-relaxed ${slaInfo.bgClass} ${slaInfo.textClass} ring-1 ${slaInfo.ringClass}`}
              >
                <Flame className="mt-0.5 h-4 w-4 shrink-0" />
                {slaInfo.message}
              </motion.div>

              <CutBuilder
                weights={rules.weights}
                weightId={weightId}
                basePrice={product.price}
                onChange={setWeightId}
              />

              <PrepOptions
                preps={rules.preps}
                prepId={prepId}
                onPrepChange={setPrepId}
                visibleAddons={visibleAddons}
                addonIds={addonIds}
                onToggleAddon={(id) => toggle(id, addonIds, setAddonIds)}
                packaging={rules.packaging}
                packagingId={packagingId}
                onPackagingChange={setPackagingId}
              />

              {/* Recipe Upsell */}
              {rules.recipe && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate({
                      to: "/store/$slug",
                      params: { slug: "recipes" },
                      search: { tag: product.name } as never,
                    });
                  }}
                  className="group block w-full overflow-hidden rounded-2xl bg-gradient-to-l from-amber-500/20 via-rose-500/10 to-orange-500/20 p-3.5 text-right ring-1 ring-amber-500/40 transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/25 text-3xl shadow-soft">
                      {rules.recipe.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-extrabold text-amber-800 dark:text-amber-300">
                        ✨ بوابة وصفات الشيف
                      </p>
                      <p className="truncate text-[13px] font-extrabold text-foreground">
                        اكتشف أشهى الوصفات لهذه القطعية!
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {rules.recipe.title}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow-pill transition group-hover:translate-x-[-2px]">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              )}

              {/* Cross-sell */}
              {rules.crossSell.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h3 className="text-sm font-extrabold">منتجات مكملة</h3>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      اسحب يميناً ←
                    </span>
                  </div>
                  <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
                    <div className="flex gap-2.5 pb-2">
                      {rules.crossSell.map((c) => {
                        const active = crossIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            className={`relative flex w-[120px] shrink-0 flex-col items-center gap-1 rounded-2xl border-2 p-2.5 transition ${
                              active ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" : "border-border bg-card"
                            }`}
                          >
                            <span className="text-3xl">{c.emoji}</span>
                            <span className="line-clamp-1 text-[11px] font-extrabold">{c.label}</span>
                            <span className="text-[10px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                              +{toLatin(c.price)} ج.م
                            </span>
                            <button
                              type="button"
                              onClick={() => toggle(c.id, crossIds, setCrossIds)}
                              aria-label={active ? "إزالة" : "إضافة"}
                              className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full shadow-pill transition active:scale-90 ${
                                active ? "bg-emerald-500 text-white" : "bg-rose-600 text-white"
                              }`}
                            >
                              {active ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={3.5} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Note */}
              <Panel
                icon={<MessageSquare className="h-4 w-4 text-rose-600" />}
                title="ملاحظات للجزار/الشيف"
                defaultOpen={false}
              >
                <div className="relative">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثال: تقطيع الشاورما رفيع جداً، فصل الرأس عن السمك، تتبيل خفيف بدون شطة…"
                    rows={3}
                    maxLength={140}
                    className="w-full resize-none rounded-xl border-2 border-border bg-background p-3 text-[12px] font-bold leading-relaxed outline-none ring-rose-500/40 placeholder:font-medium placeholder:text-muted-foreground/70 focus:border-rose-500 focus:ring-2"
                  />
                  <span className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {toLatin(note.length)}/{toLatin(140)}
                  </span>
                </div>
              </Panel>

              {/* Qty + total */}
              <section className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/5 p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow-pill"
                    aria-label="إنقاص"
                  >−</button>
                  <span className="min-w-[1.5ch] text-center font-display text-base font-extrabold tabular-nums">
                    {toLatin(qty)}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white shadow-pill"
                    aria-label="زيادة"
                  >+</button>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold text-muted-foreground">الإجمالي</p>
                  {useEngine && (
                    <div className="mb-1 space-y-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                      <p>السطر: {toLatin(Math.round(lineTotal))} ج.م</p>
                      {crossTotal > 0 && <p>+ مكمّلات: {toLatin(Math.round(crossTotal))} ج.م</p>}
                      {feeTotal > 0 && <p>+ رسوم تبريد: {toLatin(Math.round(feeTotal))} ج.م</p>}
                      {discountTotal > 0 && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          − خصم: {toLatin(Math.round(discountTotal))} ج.م
                        </p>
                      )}
                    </div>
                  )}
                  <p className="font-display text-lg font-extrabold tabular-nums text-foreground">
                    <AnimatedNumber value={grand} /> ج.م
                  </p>
                </div>
              </section>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 border-t border-border/60 bg-card/95 p-4">
              <button
                onClick={confirm}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 font-display text-sm font-extrabold text-white shadow-pill transition active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                أضف إلى السلة · <AnimatedNumber value={grand} /> ج.م
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ButcherSheet;
