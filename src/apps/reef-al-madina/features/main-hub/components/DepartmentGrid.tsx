/**
 * DepartmentGrid — Phase 31 Aesthetic Ascendancy.
 * ------------------------------------------------
 * Dual-mode Sovereign stem cell:
 *  - "grid"    → Apple-tier squircle bento grid with staggered reveal
 *  - "stacked" → iOS App Switcher style 3D vertical card stack with drag
 *
 * 100% token-compliant — all tints sourced from CSS variables defined
 * in `src/styles.css` (light + dark). No raw hex/HSL strings.
 */
import { Link } from "@tanstack/react-router";
import { memo, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { LayoutGrid, Layers } from "lucide-react";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";

type Dept = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  to: string;
  tintVar: string;       // CSS variable name (without `--`)
  perishable?: boolean;
  featured?: boolean;
};

const DEPARTMENTS: Dept[] = [
  { id: "supermarket", title: "السوبرماركت",      subtitle: "كل احتياجاتك اليومية", emoji: "🛒", to: "/store/supermarket", tintVar: "dept-fresh", featured: true },
  { id: "baskets",     title: "سلال الريف",       subtitle: "سلال جاهزة وتوفير",     emoji: "🧺", to: "/store/baskets",     tintVar: "dept-leaf" },
  { id: "produce",     title: "خضار وفاكهة",      subtitle: "طازج من المزرعة",       emoji: "🥬", to: "/store/produce",     tintVar: "dept-greens", perishable: true },
  { id: "dairy",       title: "الألبان",          subtitle: "كل صباح",               emoji: "🥛", to: "/store/dairy",       tintVar: "dept-dairy", perishable: true },
  { id: "meat",        title: "الجزارة",          subtitle: "تقطيع حسب الطلب",       emoji: "🥩", to: "/store/meat",        tintVar: "dept-meat", perishable: true },
  { id: "kitchen",     title: "مطبخ ريف",         subtitle: "طبخ بيتي جاهز",         emoji: "🍳", to: "/store/kitchen",     tintVar: "dept-kitchen", perishable: true },
  { id: "sweets",      title: "الحلويات",         subtitle: "تورتات ومخبوزات",       emoji: "🍰", to: "/store/sweets",      tintVar: "dept-sweets" },
  { id: "village",     title: "من القرية",         subtitle: "منتجات بلدية",          emoji: "🌾", to: "/store/village",     tintVar: "dept-village" },
  { id: "wholesale",   title: "ريف الجملة",       subtitle: "أسعار الكميات",         emoji: "📦", to: "/store/wholesale",   tintVar: "dept-village" },
  { id: "pharmacy",    title: "الصيدلية",         subtitle: "دواؤك بأمان",           emoji: "💊", to: "/store/pharmacy",    tintVar: "dept-pharmacy" },
  { id: "library",     title: "مكتبة الطلبة",     subtitle: "كل ما يلزم للدراسة",    emoji: "📚", to: "/store/library",     tintVar: "dept-library" },
  { id: "homegoods",   title: "الأدوات المنزلية",  subtitle: "تجهيزات البيت",         emoji: "🏠", to: "/store/home",        tintVar: "dept-home" },
  { id: "restaurants", title: "المطاعم",          subtitle: "ألذ الأطباق",           emoji: "🍽️", to: "/store/restaurants", tintVar: "dept-restaurants" },
];

type ViewMode = "grid" | "stacked";

const haptic = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  } catch {
    /* ignore */
  }
};

const tintBg = (tintVar: string) => `hsl(var(--${tintVar}))`;

// ───────────────────────────── GRID MODE ─────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 24 } },
};

const GridMode = memo(function GridMode({
  items,
  titleSize,
  subSize,
}: {
  items: (Dept & { unavailable: boolean })[];
  titleSize: string;
  subSize: string;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 grid-flow-dense gap-3"
    >
      {items.map((d) => (
        <motion.div
          key={d.id}
          variants={cardVariants}
          whileTap={d.unavailable ? undefined : { scale: 0.96 }}
          className="relative"
        >
          <Link
            to={d.to}
            onClick={d.unavailable ? undefined : haptic}
            className={cn(
              "group relative flex h-full min-h-[120px] w-full flex-col justify-end overflow-hidden rounded-[28px] shadow-soft ring-1 ring-border/40 transition ease-apple",
              d.unavailable
                ? "opacity-50 pointer-events-none"
                : "hover:-translate-y-0.5 hover:shadow-tile",
            )}
            style={{ backgroundColor: tintBg(d.tintVar) }}
          >
            <div className="relative z-10 p-3.5">
              <div
                className={cn(
                  "mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-card/90 text-xl shadow-sm ring-1 ring-border/50",
                )}
              >
                <span aria-hidden>{d.emoji}</span>
              </div>
              <p className={cn("font-display font-extrabold text-foreground", titleSize)}>
                {d.title}
              </p>
              <p className={cn("mt-0.5 font-medium text-muted-foreground", subSize)}>
                {d.unavailable ? "غير متاح في منطقتك" : d.subtitle}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
});

// ─────────────────────────── STACKED MODE ───────────────────────────

const StackedMode = memo(function StackedMode({
  items,
}: {
  items: (Dept & { unavailable: boolean })[];
}) {
  const [active, setActive] = useState(0);
  const total = items.length;

  const cycle = useCallback(
    (dir: 1 | -1) => {
      haptic();
      setActive((i) => (i + dir + total) % total);
    },
    [total],
  );

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -60 || info.velocity.y < -400) cycle(1);
    else if (info.offset.y > 60 || info.velocity.y > 400) cycle(-1);
  };

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-sm select-none">
      <AnimatePresence initial={false}>
        {items.map((d, i) => {
          // Visual offset relative to active card; cards behind are stacked up.
          const offset = (i - active + total) % total;
          if (offset > 4) return null; // only render top 5 in the stack
          const isTop = offset === 0;
          return (
            <motion.div
              key={d.id}
              drag={isTop ? "y" : false}
              dragElastic={0.18}
              dragConstraints={{ top: 0, bottom: 0 }}
              onDragEnd={isTop ? onDragEnd : undefined}
              animate={{
                scale: 1 - offset * 0.05,
                y: -offset * 22,
                opacity: 1 - offset * 0.18,
                zIndex: total - offset,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="absolute inset-x-4 top-2 h-[360px] overflow-hidden rounded-[36px] shadow-tile ring-1 ring-border/50"
              style={{ background: tintBg(d.tintVar) }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full opacity-60 blur-3xl"
                style={{ background: `hsl(var(--${d.tintVar}))` }}
              />
              <div className="relative z-10 flex h-full flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-card/80 text-4xl shadow-sm ring-1 ring-border/50 backdrop-blur-xl">
                    <span aria-hidden>{d.emoji}</span>
                  </div>
                  <span className="rounded-full bg-card/70 px-3 py-1 text-[11px] font-bold text-muted-foreground backdrop-blur-md">
                    {active + 1} / {total}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-3xl font-extrabold text-foreground">
                    {d.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {d.unavailable ? "غير متاح في منطقتك" : d.subtitle}
                  </p>
                  <Link
                    to={d.to}
                    onClick={haptic}
                    className={cn(
                      "mt-4 inline-flex items-center justify-center rounded-2xl bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-pill transition active:scale-95",
                      d.unavailable && "pointer-events-none opacity-40",
                    )}
                  >
                    ادخل القسم
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Cycle controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => cycle(-1)}
          className="rounded-full bg-card/80 px-4 py-2 text-xs font-bold text-foreground shadow-soft ring-1 ring-border/50 backdrop-blur-xl"
        >
          السابق
        </button>
        <button
          type="button"
          onClick={() => cycle(1)}
          className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background shadow-pill"
        >
          التالي
        </button>
      </div>
    </div>
  );
});

// ───────────────────────────── ROOT ─────────────────────────────

export const DepartmentGrid = () => {
  const { zone } = useLocation();
  const { viewMode: uiViewMode } = useUI();
  const [mode, setMode] = useState<ViewMode>("grid");

  const items = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        unavailable: Boolean(!zone.acceptsPerishables && d.perishable),
      })),
    [zone.acceptsPerishables],
  );

  const titleSize = uiViewMode === "simplified" ? "text-[15px]" : "text-[13px]";
  const subSize = uiViewMode === "simplified" ? "text-[12px]" : "text-[10.5px]";

  const toggle = (next: ViewMode) => {
    if (next === mode) return;
    haptic();
    setMode(next);
  };

  return (
    <section className="animate-float-up" style={{ animationDelay: "180ms" }}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          أقسام ريف المدينة
        </h2>
        <div className="inline-flex items-center gap-1 rounded-full bg-card/80 p-1 shadow-soft ring-1 ring-border/50 backdrop-blur-xl">
          <button
            type="button"
            aria-pressed={mode === "grid"}
            onClick={() => toggle("grid")}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
              mode === "grid"
                ? "bg-foreground text-background shadow-pill"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={mode === "stacked"}
            onClick={() => toggle("stacked")}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-full transition",
              mode === "stacked"
                ? "bg-foreground text-background shadow-pill"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <GridMode items={items} titleSize={titleSize} subSize={subSize} />
          </motion.div>
        ) : (
          <motion.div
            key="stacked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <StackedMode items={items} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default DepartmentGrid;
