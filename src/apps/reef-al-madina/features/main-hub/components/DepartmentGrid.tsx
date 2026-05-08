/**
 * DepartmentGrid — Phase 34 Tri-Mode Final Aesthetic Ascendancy.
 * ----------------------------------------------------------------
 * Three Sovereign view modes for the Departments hub:
 *   1) "slices"   — Magnified vertical glass cards, horizontal carousel.
 *   2) "bubbles"  — Apple-Watch style infinite floating squircles.
 *   3) "graded"   — Size-hierarchy slices (primary vs. secondary).
 *
 * Pastel hues from `--dept-*` tokens are STRICTLY preserved as accents
 * and glows. Card bodies use `--card`/`--background` with backdrop-blur
 * to harmonize with the active Sovereign theme (light/dark adaptive).
 */
import { Link } from "@tanstack/react-router";
import { memo, useMemo, useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ChevronLeft, LayoutGrid, Circle, Rows3 } from "lucide-react";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { cn } from "@/lib/utils";

type Dept = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  to: string;
  tintVar: string;
  perishable?: boolean;
  weight?: "primary" | "secondary"; // for graded mode
};

const DEPARTMENTS: Dept[] = [
  { id: "supermarket", title: "السوبرماركت",     subtitle: "كل احتياجاتك اليومية", emoji: "🛒", to: "/store/supermarket", tintVar: "dept-fresh",      weight: "primary"   },
  { id: "baskets",     title: "سلال الريف",       subtitle: "سلال جاهزة وتوفير",     emoji: "🧺", to: "/store/baskets",     tintVar: "dept-leaf",       weight: "primary"   },
  { id: "produce",     title: "خضار وفاكهة",      subtitle: "طازج من المزرعة",       emoji: "🥬", to: "/store/produce",     tintVar: "dept-greens",     weight: "primary",   perishable: true },
  { id: "dairy",       title: "الألبان",          subtitle: "كل صباح",               emoji: "🥛", to: "/store/dairy",       tintVar: "dept-dairy",      weight: "secondary", perishable: true },
  { id: "meat",        title: "الجزارة",          subtitle: "تقطيع حسب الطلب",       emoji: "🥩", to: "/store/meat",        tintVar: "dept-meat",       weight: "primary",   perishable: true },
  { id: "kitchen",     title: "مطبخ ريف",         subtitle: "طبخ بيتي جاهز",         emoji: "🍳", to: "/store/kitchen",     tintVar: "dept-kitchen",    weight: "secondary", perishable: true },
  { id: "sweets",      title: "الحلويات",         subtitle: "تورتات ومخبوزات",       emoji: "🍰", to: "/store/sweets",      tintVar: "dept-sweets",     weight: "secondary" },
  { id: "village",     title: "من القرية",         subtitle: "منتجات بلدية",          emoji: "🌾", to: "/store/village",     tintVar: "dept-village",    weight: "secondary" },
  { id: "wholesale",   title: "ريف الجملة",       subtitle: "أسعار الكميات",         emoji: "📦", to: "/store/wholesale",   tintVar: "dept-village",    weight: "secondary" },
  { id: "pharmacy",    title: "الصيدلية",         subtitle: "دواؤك بأمان",           emoji: "💊", to: "/store/pharmacy",    tintVar: "dept-pharmacy",   weight: "primary"   },
  { id: "library",     title: "مكتبة الطلبة",     subtitle: "كل ما يلزم للدراسة",    emoji: "📚", to: "/store/library",     tintVar: "dept-library",    weight: "secondary" },
  { id: "homegoods",   title: "الأدوات المنزلية",  subtitle: "تجهيزات البيت",         emoji: "🏠", to: "/store/home",        tintVar: "dept-home",       weight: "secondary" },
  { id: "restaurants", title: "المطاعم",          subtitle: "ألذ الأطباق",           emoji: "🍽️", to: "/store/restaurants", tintVar: "dept-restaurants", weight: "primary"  },
];

const haptic = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(15);
  } catch { /* ignore */ }
};

type Mode = "slices" | "bubbles" | "graded";

/* ───────────────────────────── Mode 1 — Slices ─────────────────────────── */

const Slice = memo(function Slice({
  d,
  index,
  size = "lg",
}: {
  d: Dept & { unavailable: boolean };
  index: number;
  size?: "lg" | "md" | "sm";
}) {
  const dims =
    size === "lg" ? "h-[480px] w-[320px]"
    : size === "md" ? "h-[360px] w-[240px]"
    : "h-[260px] w-[190px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 220, damping: 26 }}
      className="snap-center shrink-0"
    >
      <Link
        to={d.to}
        onClick={d.unavailable ? undefined : haptic}
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-[40px] p-6 ring-1 ring-border/40 shadow-tile transition-transform ease-apple",
          dims,
          d.unavailable
            ? "opacity-40 pointer-events-none"
            : "active:scale-[.97] hover:-translate-y-1",
        )}
      >
        {/* Pastel accent glow — preserved hue */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(120% 80% at 50% 0%, hsl(var(--${d.tintVar}) / 0.95) 0%, hsl(var(--${d.tintVar}) / 0.55) 45%, hsl(var(--card) / 0.85) 100%)`,
          }}
        />
        {/* Glass body — adapts to light/dark via card token */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 backdrop-blur-xl"
          style={{ backgroundColor: "hsl(var(--card) / 0.35)" }}
        />

        <div className="flex items-start justify-between">
          <div
            className="inline-flex items-center justify-center rounded-[28px] bg-card/80 shadow-soft ring-1 ring-border/40 backdrop-blur-md"
            style={{
              height: size === "lg" ? 92 : size === "md" ? 76 : 60,
              width: size === "lg" ? 92 : size === "md" ? 76 : 60,
              fontSize: size === "lg" ? 56 : size === "md" ? 44 : 32,
            }}
          >
            <span aria-hidden>{d.emoji}</span>
          </div>
          <span className="rounded-full bg-card/90 px-3 py-1 text-[10px] font-bold text-muted-foreground ring-1 ring-border/40 backdrop-blur-md">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className={cn(
              "font-display font-extrabold leading-tight text-foreground",
              size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg",
            )}>
              {d.title}
            </h3>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">
              {d.unavailable ? "غير متاح في منطقتك" : d.subtitle}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-pill">
            <span>ادخل القسم</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

const SlicesMode = ({ items }: { items: (Dept & { unavailable: boolean })[] }) => {
  const cardW = 320;
  return (
    <div
      className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6"
      style={{ paddingInline: `calc(50% - ${cardW / 2}px)` }}
    >
      {items.map((d, i) => <Slice key={d.id} d={d} index={i} size="lg" />)}
    </div>
  );
};

/* ───────────────────────────── Mode 2 — Bubbles ────────────────────────── */

type BubblePos = { x: number; y: number; size: number };

/** Honeycomb-ish staggered grid mirroring an Apple-Watch springboard. */
const computeBubbleLayout = (count: number): BubblePos[] => {
  const cols = 4;
  const cellW = 110;
  const cellH = 100;
  const baseSize = 88;
  const positions: BubblePos[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const xOffset = row % 2 === 0 ? 0 : cellW / 2;
    positions.push({
      x: col * cellW + xOffset,
      y: row * cellH * 0.86,
      size: baseSize,
    });
  }
  return positions;
};

const Bubble = ({
  d,
  pos,
  scrollY,
  containerH,
}: {
  d: Dept & { unavailable: boolean };
  pos: BubblePos;
  scrollY: MotionValue<number>;
  containerH: number;
}) => {
  // Bubbles closer to the visible center get magnified.
  const scale = useTransform(scrollY, (v) => {
    const center = v + containerH / 2;
    const dist = Math.abs(pos.y + pos.size / 2 - center);
    const t = Math.max(0, 1 - dist / (containerH * 0.55));
    return 0.62 + t * 0.55; // 0.62 → 1.17
  });
  const opacity = useTransform(scrollY, (v) => {
    const center = v + containerH / 2;
    const dist = Math.abs(pos.y + pos.size / 2 - center);
    return Math.max(0.35, 1 - dist / (containerH * 0.7));
  });

  return (
    <motion.div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: pos.size,
        height: pos.size,
        scale,
        opacity,
      }}
    >
      <Link
        to={d.to}
        onClick={d.unavailable ? undefined : haptic}
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[34px] ring-1 ring-border/40 shadow-tile transition-transform ease-apple",
          d.unavailable ? "opacity-40 pointer-events-none" : "active:scale-95",
        )}
        style={{
          background: `radial-gradient(circle at 30% 25%, hsl(var(--${d.tintVar})) 0%, hsl(var(--${d.tintVar}) / 0.65) 70%, hsl(var(--card) / 0.9) 100%)`,
        }}
      >
        <span className="text-3xl" aria-hidden>{d.emoji}</span>
        <span className="mt-1 px-1 text-center text-[10px] font-bold leading-tight text-foreground">
          {d.title}
        </span>
      </Link>
    </motion.div>
  );
};

const BubblesMode = ({ items }: { items: (Dept & { unavailable: boolean })[] }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll({ container: ref });
  const [containerH, setContainerH] = useState(560);
  useEffect(() => {
    if (ref.current) setContainerH(ref.current.clientHeight);
  }, []);

  const positions = useMemo(() => computeBubbleLayout(items.length), [items.length]);
  const totalH = positions.length
    ? Math.max(...positions.map((p) => p.y + p.size)) + 80
    : 0;
  const totalW = 4 * 110 + 55; // cols * cellW + offset

  return (
    <div
      ref={ref}
      className="no-scrollbar relative mx-auto h-[560px] overflow-y-auto overscroll-contain"
      style={{ width: totalW + 32, paddingInline: 16 }}
    >
      <div style={{ position: "relative", height: totalH, width: totalW }}>
        {items.map((d, i) => (
          <Bubble
            key={d.id}
            d={d}
            pos={positions[i]}
            scrollY={scrollY}
            containerH={containerH}
          />
        ))}
      </div>
    </div>
  );
};

/* ───────────────────────────── Mode 3 — Graded ─────────────────────────── */

const GradedMode = ({ items }: { items: (Dept & { unavailable: boolean })[] }) => {
  const primary = items.filter((d) => d.weight === "primary");
  const secondary = items.filter((d) => d.weight !== "primary");

  return (
    <div className="space-y-6">
      {/* Primary — large slices, horizontal scroll */}
      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ paddingInline: "calc(50% - 160px)" }}
      >
        {primary.map((d, i) => <Slice key={d.id} d={d} index={i} size="lg" />)}
      </div>

      {/* Secondary — medium slices, horizontal scroll */}
      <div className="px-4">
        <h3 className="mb-2 text-[13px] font-bold text-muted-foreground">المزيد من الأقسام</h3>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
          {secondary.map((d, i) => <Slice key={d.id} d={d} index={i} size="sm" />)}
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────── Mode toggle ─────────────────────────────── */

const MODE_META: Record<Mode, { icon: typeof LayoutGrid; label: string }> = {
  slices:  { icon: Rows3,      label: "شرائح" },
  bubbles: { icon: Circle,     label: "فقاعات" },
  graded:  { icon: LayoutGrid, label: "متدرج" },
};

const ModeToggle = ({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) => (
  <div className="inline-flex items-center gap-1 rounded-full bg-card/80 p-1 ring-1 ring-border/40 backdrop-blur-md shadow-soft">
    {(Object.keys(MODE_META) as Mode[]).map((m) => {
      const Icon = MODE_META[m].icon;
      const active = m === mode;
      return (
        <button
          key={m}
          type="button"
          aria-label={MODE_META[m].label}
          aria-pressed={active}
          onClick={() => { haptic(); onChange(m); }}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition ease-apple",
            active
              ? "bg-foreground text-background shadow-pill scale-105"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </button>
      );
    })}
  </div>
);

/* ───────────────────────────── Root ────────────────────────────────────── */

export const DepartmentGrid = () => {
  const { zone } = useLocation();
  const [mode, setMode] = useState<Mode>("slices");

  const items = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        unavailable: Boolean(!zone.acceptsPerishables && d.perishable),
      })),
    [zone.acceptsPerishables],
  );

  return (
    <section className="animate-float-up" style={{ animationDelay: "120ms" }}>
      {/* Title row — sits directly under the Sovereign TopBar */}
      <div className="mb-4 flex items-end justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            أقسام ريف المدينة
          </h1>
          <p className="text-[12px] font-medium text-muted-foreground">
            {mode === "slices" && "اسحب أفقياً للتنقل بين الأقسام"}
            {mode === "bubbles" && "مرر عمودياً — يكبر القسم في المنتصف"}
            {mode === "graded" && "أقسام رئيسية بحجم أكبر وأقسام فرعية"}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "slices"  && <SlicesMode items={items} />}
      {mode === "bubbles" && <BubblesMode items={items} />}
      {mode === "graded"  && <GradedMode items={items} />}
    </section>
  );
};

export default DepartmentGrid;
