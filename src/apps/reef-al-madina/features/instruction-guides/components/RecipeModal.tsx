// Lazy-loaded recipe detail modal. Heavy: video iframe, tabs, ingredients editor.

import { useMemo, useState } from "react";
import {
  Clock, Users, Flame, X, Minus, Plus, Check, Sparkles, Timer, Lock,
  PlayCircle, ChefHat, Utensils, ShoppingBasket, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney, toLatin } from "@/lib/format";
import { type Product } from "@/core/catalog/legacyProduct.types";
import { getById } from "@/core/catalog/runtime/legacyRuntime";
import { useCart } from "@/core/orders/runtime/react/CartProvider";
import { RECIPE_CONTENT, type Recipe, type ToolItem } from "@/apps/reef-al-madina/features/instruction-guides/data";
import { Button } from "@/components/ui/button";

export default function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { add } = useCart();
  const content = RECIPE_CONTENT[recipe.id];
  const [servings, setServings] = useState(recipe.baseServings);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [orderQty, setOrderQty] = useState(1);
  const [tab, setTab] = useState<"overview" | "steps" | "tools">("overview");
  const [showVideo, setShowVideo] = useState(false);

  const ingredientsCost = useMemo(
    () => recipe.ingredients.filter((i) => !excluded.has(i.id)).reduce((s, i) => s + i.cost, 0),
    [recipe, excluded],
  );
  const totalPrice = Math.round(ingredientsCost * (servings / recipe.baseServings) * orderQty);

  const toggle = (ing: { id: string; essential?: boolean }) => {
    if (ing.essential) return;
    setExcluded((p) => { const x = new Set(p); x.has(ing.id) ? x.delete(ing.id) : x.add(ing.id); return x; });
  };

  const handleAdd = () => {
    const asProduct: Product = {
      id: `recipe-${recipe.id}-${Date.now()}`,
      name: `${recipe.name} (${toLatin(servings)} أفراد)`,
      unit: orderQty > 1 ? `${toLatin(orderQty)} طلبات` : `وصفة شيف`,
      price: totalPrice / orderQty,
      image: recipe.image,
      category: "وصفات",
      source: "recipes",
    };
    add(asProduct, orderQty);
    onClose();
  };

  const addTool = (t: ToolItem) => {
    if (t.productId) {
      const primary = getById(t.productId);
      if (primary) { add(primary, 1); toast.success(`تمت إضافة ${primary.name} إلى السلة`); return; }
    }
    if (t.fallbackId) {
      const fb = getById(t.fallbackId);
      if (fb) {
        add(fb, 1);
        toast.success(`تمت إضافة البديل: ${fb.name}`, {
          description: `${t.name} غير متوفر حاليًا — أضفنا البديل المناسب.`,
        });
        return;
      }
    }
    toast.error(`${t.name} غير متوفر حاليًا في المتجر`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40 animate-float-up" />
      <div
        className="relative mx-auto flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-background shadow-float animate-float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-background/90 p-3">
          <Button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5">
            <X className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold text-muted-foreground">تفاصيل الوصفة</span>
          <span className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            {showVideo && content?.videoUrl ? (
              <div className="aspect-[4/3] w-full bg-black">
                <iframe
                  src={`${content.videoUrl}?autoplay=1&rel=0`}
                  title={recipe.name}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <>
                <img src={recipe.image} alt={recipe.name} className="aspect-[4/3] w-full object-cover" />
                {content?.videoUrl && (
                  <Button
                    onClick={() => setShowVideo(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
                  >
                    <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-pill">
                      <PlayCircle className="h-5 w-5 text-foreground" />
                      <span className="text-xs font-extrabold text-foreground">شاهد طريقة التحضير</span>
                    </div>
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="space-y-5 p-5">
            <div>
              <h2 className="font-display text-2xl font-extrabold">{recipe.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {toLatin(recipe.cookTime)}د طهي</span>
                {content && <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {toLatin(content.prepTime)}د تحضير</span>}
                <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> {toLatin(recipe.calories)} سعرة</span>
                {content && (
                  <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold">{content.difficulty}</span>
                )}
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">{recipe.category}</span>
              </div>
            </div>

            <div className="glass-strong flex rounded-full p-1 shadow-soft">
              {([
                { k: "overview", l: "الوصفة" },
                { k: "steps", l: "خطوات التحضير" },
                { k: "tools", l: "الأواني" },
              ] as const).map((t) => (
                <Button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`flex-1 rounded-full py-1.5 text-[11px] font-extrabold transition ${
                    tab === t.k ? "bg-foreground text-background shadow-pill" : "text-muted-foreground"
                  }`}
                >
                  {t.l}
                </Button>
              ))}
            </div>

            {tab === "overview" && (
              <>
                {content && (
                  <div>
                    <h3 className="mb-2 font-display text-base font-extrabold">القيم الغذائية / حصة</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { l: "بروتين", v: content.nutrition.protein, c: "text-rose-600 dark:text-rose-400" },
                        { l: "كارب", v: content.nutrition.carbs, c: "text-amber-600 dark:text-amber-400" },
                        { l: "دهون", v: content.nutrition.fat, c: "text-violet-600 dark:text-violet-400" },
                        { l: "ألياف", v: content.nutrition.fiber, c: "text-emerald-600 dark:text-emerald-400" },
                      ].map((n) => (
                        <div key={n.l} className="glass rounded-xl p-2.5 text-center shadow-soft">
                          <p className={`font-display text-lg font-extrabold tabular-nums ${n.c}`}>{toLatin(n.v)}<span className="text-[9px] font-bold opacity-70">غ</span></p>
                          <p className="text-[10px] font-bold text-muted-foreground">{n.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass-strong flex items-center justify-between rounded-2xl p-3 shadow-soft">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">عدد الأفراد</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setServings((s) => Math.max(1, s - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10">
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center font-display text-lg font-extrabold tabular-nums">{toLatin(servings)}</span>
                    <Button onClick={() => setServings((s) => Math.min(12, s + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-display text-base font-extrabold">المكونات</h3>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    احذف ما هو متوفر لديك لينخفض السعر · المكونات الأساسية مقفلة
                  </p>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ing) => {
                      const off = excluded.has(ing.id);
                      const locked = !!ing.essential;
                      return (
                        <Button
                          key={ing.id}
                          onClick={() => toggle(ing)}
                          disabled={locked}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-right transition ${
                            locked ? "bg-primary-soft/40 cursor-not-allowed" : off ? "bg-foreground/5 opacity-50" : "glass"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {locked ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Lock className="h-3 w-3" strokeWidth={3} />
                              </span>
                            ) : (
                              <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                off ? "border-muted-foreground" : "border-primary bg-primary text-primary-foreground"
                              }`}>
                                {!off && <Check className="h-3 w-3" strokeWidth={3} />}
                              </span>
                            )}
                            <span className={`text-sm ${off ? "line-through" : ""}`}>{ing.name}</span>
                            {locked && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-primary-foreground">أساسي</span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-primary tabular-nums">
                            {off ? "—" : `${toLatin(ing.cost)} ج`}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-strong flex items-center justify-between rounded-2xl p-3 shadow-soft">
                  <div>
                    <p className="text-sm font-bold">عدد الطلبات</p>
                    <p className="text-[10px] text-muted-foreground">اطلب الوصفة أكثر من مرة لمزيد من الأفراد</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => setOrderQty((q) => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10">
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center font-display text-lg font-extrabold tabular-nums">{toLatin(orderQty)}</span>
                    <Button onClick={() => setOrderQty((q) => q + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {tab === "steps" && content && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-display text-base font-extrabold">
                  <ChefHat className="h-4 w-4 text-primary" /> خطوات التحضير
                </h3>
                <ol className="space-y-2.5">
                  {content.steps.map((s, i) => (
                    <li key={i} className="glass flex gap-3 rounded-xl p-3 shadow-soft">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-primary-foreground tabular-nums">
                        {toLatin(i + 1)}
                      </span>
                      <p className="text-sm leading-relaxed">{s}</p>
                    </li>
                  ))}
                </ol>
                {content.videoUrl && !showVideo && (
                  <Button
                    onClick={() => setShowVideo(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-extrabold text-background shadow-pill"
                  >
                    <PlayCircle className="h-4 w-4" /> شاهد الفيديو الكامل
                  </Button>
                )}
              </div>
            )}

            {tab === "tools" && content && (
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-display text-base font-extrabold">
                  <Utensils className="h-4 w-4 text-primary" /> الأواني المطلوبة
                </h3>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  أضف ما ينقصك للسلة من قسم أدوات المطبخ، أو استخدم البديل المتوفر لديك.
                </p>
                <div className="space-y-2.5">
                  {content.tools.map((t) => {
                    const stockProduct = t.productId ? getById(t.productId) : undefined;
                    const inStock = !!stockProduct;
                    const fallbackProduct = !inStock && t.fallbackId ? getById(t.fallbackId) : undefined;
                    const effective = stockProduct ?? fallbackProduct;
                    const displayPrice = effective?.price ?? t.price;
                    return (
                      <div key={t.id} className="glass-strong rounded-2xl p-3 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-display text-sm font-extrabold">{t.name}</p>
                              {!inStock && fallbackProduct && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  بديل تلقائي
                                </span>
                              )}
                            </div>
                            {!inStock && fallbackProduct && (
                              <p className="mt-1 flex items-start gap-1 text-[11px] text-foreground/80">
                                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                                <span>سنضيف <b>{fallbackProduct.name}</b> بدلاً منه</span>
                              </p>
                            )}
                            {t.alternatives && t.alternatives.length > 0 && (
                              <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
                                <Repeat className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>بديل: {t.alternatives.join(" · ")}</span>
                              </p>
                            )}
                          </div>
                          {effective && displayPrice ? (
                            <Button
                              onClick={() => addTool(t)}
                              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold shadow-pill active:scale-95 ${
                                inStock ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white"
                              }`}
                            >
                              <ShoppingBasket className="h-3 w-3" />
                              <span className="tabular-nums">
                                {inStock ? "" : "البديل "}{toLatin(displayPrice)} ج
                              </span>
                            </Button>
                          ) : (
                            <span className="shrink-0 rounded-full bg-foreground/5 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                              غير متوفر
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-20" />
          </div>
        </div>

        <div
          className="border-t border-border bg-background p-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            onClick={handleAdd}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 font-bold text-primary-foreground shadow-pill transition active:scale-[0.98]"
          >
            <span className="text-sm">أضف الوصفة للسلة</span>
            <span className="font-display text-base font-extrabold tabular-nums">{fmtMoney(totalPrice)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
