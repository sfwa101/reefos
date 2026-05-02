import { lazy, Suspense, useMemo, useState } from "react";
import BackHeader from "@/components/BackHeader";
import { storeThemes } from "@/lib/storeThemes";
import {
  Bot,
  CalendarClock,
  Camera,
  ChevronLeft,
  ScanLine,
  Search,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { categories, idToLabel, RX } from "@/features/pharmacy/data";
import type { CatId, RxProduct } from "@/features/pharmacy/types";
import { SmartBar } from "@/features/pharmacy/components/SmartBar";
import { CategoryRail } from "@/features/pharmacy/components/CategoryRail";
import {
  DetailedProductCard,
  RecCard,
} from "@/features/pharmacy/components/ProductCards";
import { EmptyState } from "@/features/pharmacy/components/EmptyState";

// Heavy modals — lazy-loaded to keep the initial chunk lean.
const ProductOverlay = lazy(
  () => import("@/features/pharmacy/components/ProductOverlay"),
);
const ScannerOverlay = lazy(
  () => import("@/features/pharmacy/components/ScannerOverlay"),
);

const Pharmacy = () => {
  const theme = storeThemes.pharmacy;
  const [active, setActive] = useState<CatId>("all");
  const [query, setQuery] = useState("");
  const [openProduct, setOpenProduct] = useState<RxProduct | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    return RX.filter((p) => active === "all" || p.category === active).filter(
      (p) => !q || p.name.includes(q) || p.brand.includes(q),
    );
  }, [active, query]);

  const recommendations = useMemo(
    () => RX.filter((p) => ["vit-d3", "omega3", "serum", "firstaid"].includes(p.id)),
    [],
  );

  return (
    <div className="pb-8">
      <BackHeader title="صيدلية ريف" subtitle="أعظم صيدلية ذكية · توصيل خلال ساعة" accent="صحة" themeKey="pharmacy" />

      <section
        className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
        style={{ background: theme.gradient }}
      >
        <span
          className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-extrabold"
          style={{ color: `hsl(${theme.hue})` }}
        >
          <Sparkles className="h-3 w-3" /> ذكاء صيدلاني
        </span>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-foreground text-balance">
          ارفع وصفتك الطبية،<br />يجهّزها صيدليّنا الذكي فوراً
        </h2>
        <p className="mt-1.5 text-[12px] font-medium text-foreground/70">
          استشارة AI · تنبيه تفاعلات · تذكير دواء آلي
        </p>
      </section>

      <SmartBar
        title="أدوات ذكية"
        items={[
          { id: "ai-symptoms", label: "تحليل أعراض AI", icon: Bot, hue: "168 55% 38%" },
          { id: "ai-schedule", label: "جدول أدوية ذكي", icon: CalendarClock, hue: "210 55% 42%" },
          { id: "ai-consult", label: "استشارة صيدلي", icon: Stethoscope, hue: "340 50% 48%" },
          { id: "ai-scan", label: "مسح بصري للدواء", icon: ScanLine, hue: "32 70% 44%" },
        ]}
        onPick={(id) => {
          if (id === "ai-scan") setScannerOpen(true);
          else toast(`جارٍ فتح ${idToLabel(id)}…`, { description: "تجربة ذكاء اصطناعي" });
        }}
      />

      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card/95 px-4 py-3 shadow-soft ring-1 ring-border/40">
        <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن دواء، فيتامين، علامة تجارية…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <CategoryRail active={active} onChange={setActive} />

      <section className="mt-5">
        <div className="mb-2 flex items-end justify-between px-1">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.6} />
              </span>
              <h3 className="font-display text-[15px] font-extrabold text-foreground">
                توصيات ذكية مقترحة لك
              </h3>
            </div>
            <p className="mt-0.5 pr-6 text-[11px] font-medium text-muted-foreground">
              مبنية على تحليل سجل صحتك بواسطة AI
            </p>
          </div>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex snap-x gap-3">
            {recommendations.map((p) => (
              <RecCard key={p.id} p={p} onOpen={() => setOpenProduct(p)} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5">
        <button
          onClick={() => setScannerOpen(true)}
          className="group relative w-full overflow-hidden rounded-[24px] p-5 text-right shadow-tile ring-1 ring-border/40 active:scale-[0.99] transition"
          style={{
            background:
              "linear-gradient(135deg, hsl(168 55% 28%) 0%, hsl(195 55% 28%) 100%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(60% 50% at 90% 0%, rgba(255,255,255,.5) 0%, transparent 60%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Camera className="h-8 w-8 text-white" strokeWidth={2.2} />
              <span
                aria-hidden
                className="absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 animate-scan rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(160 80% 70%), transparent)",
                }}
              />
            </div>
            <div className="flex-1">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white">
                AI · بيتا
              </div>
              <h3 className="font-display text-[16px] font-extrabold leading-tight text-white">
                امسح عبوة الدواء للتعرف عليه فوراً
              </h3>
              <p className="mt-1 text-[11.5px] font-medium leading-snug text-white/80">
                تفاعلات دوائية، جرعات، وبدائل بضغطة واحدة
              </p>
            </div>
            <ChevronLeft className="h-5 w-5 text-white/80" />
          </div>
        </button>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between px-1">
          <h3 className="font-display text-[16px] font-extrabold text-foreground">
            {active === "all" ? "كل منتجات الصيدلية" : categories.find((c) => c.id === active)?.name}
            <span className="mr-1.5 text-[11px] font-medium text-muted-foreground">
              · {filtered.length}
            </span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <EmptyState onScan={() => setScannerOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <DetailedProductCard key={p.id} p={p} onOpen={() => setOpenProduct(p)} />
            ))}
          </div>
        )}
      </section>

      {openProduct && (
        <Suspense fallback={null}>
          <ProductOverlay p={openProduct} onClose={() => setOpenProduct(null)} />
        </Suspense>
      )}
      {scannerOpen && (
        <Suspense fallback={null}>
          <ScannerOverlay onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}

      <style>{`
        @keyframes scan-sweep { 0%,100%{transform:translateY(-18px)} 50%{transform:translateY(18px)} }
        .animate-scan { animation: scan-sweep 1.6s ease-in-out infinite; }
        @keyframes overlay-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .animate-overlay { animation: overlay-up .32s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes overlay-fade { from{opacity:0} to{opacity:1} }
        .animate-overlay-fade { animation: overlay-fade .25s ease-out both; }
      `}</style>
    </div>
  );
};

export default Pharmacy;
