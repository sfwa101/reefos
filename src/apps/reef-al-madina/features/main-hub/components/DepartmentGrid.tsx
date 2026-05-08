/**
 * DepartmentGrid — Phase 33 Aesthetic Pivot.
 * ------------------------------------------
 * Sovereign stem cell: a single horizontal carousel of vertical
 * department slices. Liquid-silk snap scrolling, opaque token-driven
 * pastels, Apple-tier minimalism. No dual-mode toggle, no draggable
 * stack — the Emperor's locked aesthetic.
 */
import { Link } from "@tanstack/react-router";
import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { cn } from "@/lib/utils";

type Dept = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  to: string;
  tintVar: string; // CSS variable name (without `--`)
  perishable?: boolean;
};

const DEPARTMENTS: Dept[] = [
  { id: "supermarket", title: "السوبرماركت",      subtitle: "كل احتياجاتك اليومية", emoji: "🛒", to: "/store/supermarket", tintVar: "dept-fresh" },
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

const haptic = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15);
    }
  } catch {
    /* ignore */
  }
};

const Slice = memo(function Slice({
  d,
  index,
}: {
  d: Dept & { unavailable: boolean };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 240, damping: 26 }}
      className="snap-center shrink-0"
    >
      <Link
        to={d.to}
        onClick={d.unavailable ? undefined : haptic}
        className={cn(
          "group relative flex h-[380px] w-[260px] flex-col justify-between overflow-hidden rounded-[36px] p-6 ring-1 ring-border/30 shadow-tile transition-transform ease-apple",
          d.unavailable
            ? "opacity-40 pointer-events-none"
            : "active:scale-[.97] hover:-translate-y-1",
        )}
        style={{ backgroundColor: `hsl(var(--${d.tintVar}))` }}
      >
        {/* Top — emoji medallion */}
        <div className="flex items-start justify-between">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-[28px] bg-card text-5xl shadow-soft ring-1 ring-border/40">
            <span aria-hidden>{d.emoji}</span>
          </div>
          <span className="rounded-full bg-card/90 px-3 py-1 text-[10px] font-bold text-muted-foreground ring-1 ring-border/40">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Bottom — title + CTA */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-2xl font-extrabold leading-tight text-foreground">
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

export const DepartmentGrid = () => {
  const { zone } = useLocation();

  const items = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        unavailable: Boolean(!zone.acceptsPerishables && d.perishable),
      })),
    [zone.acceptsPerishables],
  );

  return (
    <section className="animate-float-up" style={{ animationDelay: "180ms" }}>
      <div className="mb-3 flex items-end justify-between px-4">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            أقسام ريف المدينة
          </h2>
          <p className="text-[12px] font-medium text-muted-foreground">
            اسحب للتنقل بين الأقسام
          </p>
        </div>
        <span className="text-[11px] font-bold text-muted-foreground">
          {items.length} أقسام
        </span>
      </div>

      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
        // Side padding equal to (viewport - card)/2 keeps cards snapped
        // to the visual center on every device size.
        style={{ paddingInline: "calc(50% - 130px)" }}
      >
        {items.map((d, i) => (
          <Slice key={d.id} d={d} index={i} />
        ))}
      </div>
    </section>
  );
};

export default DepartmentGrid;
