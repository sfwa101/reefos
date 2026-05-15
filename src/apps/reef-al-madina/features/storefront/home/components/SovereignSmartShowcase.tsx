/**
 * SovereignSmartShowcase — WAVE UI-2 (The Sovereign Smart Home Page).
 * --------------------------------------------------------------------
 * A pure presentation stem-cell that renders three high-conversion bands
 * on top of the storefront:
 *
 *   1. Hero Greeting + Promo Banner  (gradient, CTA — Mobile-First)
 *   2. Quick Categories Grid         (DB-aware: dynamicCats || curated CATS)
 *   3. Trending Horizontal Rail      (live products from CatalogGateway)
 *
 * Sovereign constraints honoured:
 *   • Zero `supabase.from(...)` — products flow through `useHomeOrchestrator`
 *     (the canonical Facade over `catalogGateway.listSection`).
 *   • Zero hardcoded products — the rail renders live `ProductCardVM[]`
 *     and gracefully shows skeletons while loading or if the catalog is
 *     empty.
 *   • Fully complementary to the existing SDUI feed (`SduiHomeFeed` + 
 *     `LayoutFactory`). It does not block, hide, or reorder admin blocks.
 */
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Truck, ShieldCheck, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import type { HomeOrchestrator } from "../hooks/useHomeOrchestrator";
import { CATS } from "../dictionaries";
import { ProductCard } from "./ProductCard";
import SmartGreeting from "@/apps/reef-al-madina/features/main-hub/components/SmartGreeting";

const TRENDING_LIMIT = 12;

export const SovereignSmartShowcase = ({
  orchestrator: orch,
}: {
  orchestrator: HomeOrchestrator;
}) => {
  const navigate = useNavigate();

  // Trending = top of the live catalog (already sorted by popularity in the gateway).
  const trending = orch.catalog.slice(0, TRENDING_LIMIT);

  return (
    <div className="space-y-6 pt-2" dir="rtl">
      {/* ───── Hero: Smart Greeting + Promo Banner ───── */}
      <section className="px-4">
        <SmartGreeting />

        <Card
          className="relative mt-3 overflow-hidden rounded-3xl border-0 bg-gradient-to-tl from-primary via-primary/85 to-primary/60 p-5 text-primary-foreground shadow-xl"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-primary-foreground/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-accent/30 blur-3xl"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2.5 py-1 text-[10px] font-extrabold backdrop-blur">
                <Sparkles className="h-3 w-3" />
                عرض اليوم
              </span>
              <h2 className="mt-2 font-display text-2xl font-black leading-tight text-balance">
                وفّر حتى ٣٠٪ <br /> على أكثر المنتجات طلباً
              </h2>
              <p className="mt-1 text-[12.5px] font-medium opacity-90">
                توصيل في نفس اليوم · ضمان الجودة · بدون رسوم خفية
              </p>

              <Button
                onClick={() => navigate({ to: "/offers" })}
                className="mt-3 inline-flex h-9 items-center gap-1 rounded-full bg-primary-foreground px-4 text-[12px] font-extrabold text-primary shadow-md transition hover:scale-[1.02] active:scale-95"
              >
                استعرض العروض
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-1 text-[10px] font-bold backdrop-blur">
              <Truck className="h-3 w-3" /> توصيل اليوم
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-1 text-[10px] font-bold backdrop-blur">
              <ShieldCheck className="h-3 w-3" /> دفع آمن
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-1 text-[10px] font-bold backdrop-blur">
              <Flame className="h-3 w-3" /> الأكثر طلباً
            </span>
          </div>
        </Card>
      </section>

      {/* ───── Quick Categories Grid ───── */}
      <section className="px-4">
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-black text-foreground">
              تسوّق حسب القسم
            </h2>
            <p className="text-[12px] text-muted-foreground">اختصر طريقك إلى ما تحتاج</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/sections" })}
            className="h-7 gap-0.5 rounded-full px-2 text-[11px] font-bold text-primary hover:bg-primary/5"
          >
            الكل
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </header>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {CATS.filter((c) => c.id !== "all").map((c) => {
            const Icon = c.icon;
            return (
              <Button
                key={c.id}
                onClick={() => orch.setCat(c.id)}
                className="flex h-auto flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card p-3 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:scale-95"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="line-clamp-2 text-center text-[11px] font-extrabold leading-tight">
                  {c.name}
                </span>
              </Button>
            );
          })}
        </div>
      </section>

      {/* ───── Trending Horizontal Rail ───── */}
      <section className="px-4">
        <header className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-lg font-black text-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              رائج الآن
            </h2>
            <p className="text-[12px] text-muted-foreground">
              منتجات يفضّلها العملاء هذا الأسبوع
            </p>
          </div>
        </header>

        {orch.loading ? (
          <ScrollArea className="-mx-4" dir="rtl">
            <div className="flex gap-3 px-4 pb-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[290px] w-[180px] shrink-0 rounded-2xl" />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        ) : trending.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              لا توجد منتجات نشطة حالياً — عُد قريباً ✨
            </p>
          </Card>
        ) : (
          <ScrollArea className="-mx-4" dir="rtl">
            <div className="flex gap-3 px-4 pb-3">
              {trending.map((p, idx) => (
                <div key={p.id} className="w-[180px] shrink-0">
                  <ProductCard
                    p={p}
                    onOpen={() => orch.setOpenId(p.id)}
                    priority={idx < 2}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}
      </section>
    </div>
  );
};

export default SovereignSmartShowcase;
