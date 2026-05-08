/**
 * DepartmentGrid — Phase 36 Scorched Earth.
 * ------------------------------------------
 * Pure 2-column vertical grid of pastel squircle department cards.
 * No tri-mode toggle, no drag physics, no scroll tracking. Just elegance.
 */
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useLocationStatic as useLocation } from "@/context/LocationContext";
import { cn } from "@/lib/utils";

type Dept = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  to: string;
  /** Tailwind classes for pastel gradient + accent text. */
  palette: string;
  perishable?: boolean;
};

// Pastel mappings derived from Emperor's reef-categories.html reference.
const DEPARTMENTS: Dept[] = [
  { id: "supermarket", title: "السوبرماركت",     subtitle: "كل احتياجاتك اليومية", emoji: "🛒", to: "/store/supermarket", palette: "bg-gradient-to-br from-[#dce9ff] to-[#eef4ff] text-[#1d4ed8]" },
  { id: "baskets",     title: "سلال الريف",       subtitle: "سلال جاهزة وتوفير",     emoji: "🧺", to: "/store/baskets",     palette: "bg-gradient-to-br from-[#f5e8d0] to-[#fdf6e4] text-[#8a5a1c]" },
  { id: "produce",     title: "خضار وفاكهة",      subtitle: "طازج من المزرعة",       emoji: "🥬", to: "/store/produce",     palette: "bg-gradient-to-br from-[#c8f5dc] to-[#e1faeb] text-[#1d7a45]", perishable: true },
  { id: "dairy",       title: "الألبان",          subtitle: "كل صباح",               emoji: "🥛", to: "/store/dairy",       palette: "bg-gradient-to-br from-[#d2f0e6] to-[#ebfaf5] text-[#1a5740]", perishable: true },
  { id: "meat",        title: "الجزارة",          subtitle: "تقطيع حسب الطلب",       emoji: "🥩", to: "/store/meat",        palette: "bg-gradient-to-br from-[#ffdfd2] to-[#ffebe4] text-[#b03020]", perishable: true },
  { id: "kitchen",     title: "مطبخ ريف",         subtitle: "طبخ بيتي جاهز",         emoji: "🍳", to: "/store/kitchen",     palette: "bg-gradient-to-br from-[#ffe4cc] to-[#fff1e0] text-[#a04515]", perishable: true },
  { id: "sweets",      title: "الحلويات",         subtitle: "تورتات ومخبوزات",       emoji: "🍰", to: "/store/sweets",      palette: "bg-gradient-to-br from-[#ffe0ec] to-[#fff0f6] text-[#b3306e]" },
  { id: "bakery",      title: "المخبوزات",         subtitle: "خبز طازج كل يوم",       emoji: "🥖", to: "/store/sweets",      palette: "bg-gradient-to-br from-[#ffebc3] to-[#fff8e1] text-[#a0600a]" },
  { id: "village",     title: "من القرية",         subtitle: "منتجات بلدية",          emoji: "🌾", to: "/store/village",     palette: "bg-gradient-to-br from-[#e8e0c8] to-[#f5efdc] text-[#7a5a1a]" },
  { id: "wholesale",   title: "ريف الجملة",       subtitle: "أسعار الكميات",         emoji: "📦", to: "/store/wholesale",   palette: "bg-gradient-to-br from-[#e0dcd0] to-[#f0ece0] text-[#5a4a30]" },
  { id: "pharmacy",    title: "الصيدلية",         subtitle: "دواؤك بأمان",           emoji: "💊", to: "/store/pharmacy",    palette: "bg-gradient-to-br from-[#d8e8f5] to-[#ecf3fa] text-[#1f5a8a]" },
  { id: "library",     title: "مكتبة الطلبة",     subtitle: "كل ما يلزم للدراسة",    emoji: "📚", to: "/store/library",     palette: "bg-gradient-to-br from-[#e0d8f0] to-[#efeafa] text-[#5a3a9a]" },
  { id: "homegoods",   title: "الأدوات المنزلية",  subtitle: "تجهيزات البيت",         emoji: "🏠", to: "/store/home",        palette: "bg-gradient-to-br from-[#d8eef0] to-[#ebf7f8] text-[#1f6a72]" },
  { id: "restaurants", title: "المطاعم",          subtitle: "ألذ الأطباق",           emoji: "🍽️", to: "/store/restaurants", palette: "bg-gradient-to-br from-[#ffe0d0] to-[#fff0e6] text-[#a8401a]" },
];

const haptic = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(15);
  } catch { /* ignore */ }
};

const Card = ({ d, index, unavailable }: { d: Dept; index: number; unavailable: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
  >
    <Link
      to={d.to}
      onClick={unavailable ? undefined : haptic}
      className={cn(
        "relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[24px] p-4 shadow-tile ring-1 ring-border/30 transition-transform ease-apple",
        d.palette,
        unavailable ? "pointer-events-none opacity-40" : "active:scale-[.97]",
      )}
    >
      <span className="text-3xl leading-none" aria-hidden>{d.emoji}</span>
      <div className="mt-3">
        <h3 className="text-[15px] font-extrabold leading-tight">{d.title}</h3>
        <p className="mt-0.5 text-[11px] font-medium opacity-75">
          {unavailable ? "غير متاح في منطقتك" : d.subtitle}
        </p>
      </div>
    </Link>
  </motion.div>
);

export const DepartmentGrid = () => {
  const { zone } = useLocation();

  return (
    <section className="grid grid-cols-2 gap-3 px-4 pt-4 pb-24">
      {DEPARTMENTS.map((d, i) => (
        <Card
          key={d.id}
          d={d}
          index={i}
          unavailable={Boolean(!zone.acceptsPerishables && d.perishable)}
        />
      ))}
    </section>
  );
};

export default DepartmentGrid;
