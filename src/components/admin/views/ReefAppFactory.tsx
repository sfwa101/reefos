/**
 * ReefAppFactory — Reef Al Madina · App Factory hub.
 *
 * Mounted at `/admin/factory`. Renders only when the Sovereign Switcher
 * has Reef Al Madina active AND the ReefModeToggle is set to "factory".
 *
 * The Factory does NOT spawn new OS companies — that is Salsabil's role.
 * It composes new "workspaces" (cashier panels, driver apps, merchant
 * boards) inside Reef Al Madina's own context.
 */
import { motion } from "framer-motion";
import {
  AppWindow,
  ArrowUpRight,
  Blocks,
  Factory,
  MonitorSmartphone,
  Plus,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { GlassKpiCard } from "@/components/admin/ui/GlassKpiCard";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { cn } from "@/lib/utils";

type FactoryCell = {
  id: string;
  name: string;
  description: string;
  icon: typeof Store;
  accent: string;
  to: string;
  badge?: string;
};

const STEM_CELLS: FactoryCell[] = [
  {
    id: "merchants",
    name: "لوحات التجار",
    description: "كل تاجر يحصل على واجهته الخاصة داخل ريف.",
    icon: Store,
    accent: "from-emerald-500 to-teal-500",
    to: "/admin/factory/merchants",
    badge: "Workspace",
  },
  {
    id: "cashiers",
    name: "لوحات الكاشير",
    description: "POS زجاجي يعمل على الموبايل والتابلت.",
    icon: MonitorSmartphone,
    accent: "from-sky-500 to-blue-600",
    to: "/admin/factory/cashiers",
    badge: "Channel",
  },
  {
    id: "drivers",
    name: "تطبيقات السائقين",
    description: "خرائط حية، طابور توصيلات، إثبات استلام.",
    icon: Truck,
    accent: "from-amber-500 to-orange-500",
    to: "/admin/factory/drivers",
    badge: "App",
  },
  {
    id: "modules",
    name: "وحدات ريف",
    description: "خلايا جذعية قابلة للتركيب على أي بيئة عمل.",
    icon: Blocks,
    accent: "from-violet-500 to-purple-600",
    to: "/admin/factory/modules",
    badge: "DNA",
  },
  {
    id: "apps",
    name: "تطبيقات مخصصة",
    description: "غلاف موبايل أبيض الهوية لكل قناة.",
    icon: AppWindow,
    accent: "from-rose-500 to-pink-600",
    to: "/admin/factory/apps",
    badge: "White-label",
  },
];

export function ReefAppFactory() {
  return (
    <div className="space-y-6 lg:space-y-8" dir="rtl">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="glass-steel-strong relative overflow-hidden rounded-3xl p-6 lg:p-8 shadow-elevated"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/35 via-teal-400/25 to-sky-400/25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-400/30 to-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
              <Factory className="h-3 w-3" /> Reef · App Factory
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
              مصنع تطبيقات ريف المدينة
            </h1>
            <p className="mt-1 max-w-xl text-sm text-foreground/70">
              ابنِ بيئات عمل جديدة لكل تاجر، كاشير، أو سائق — كل واحدة منها خلية جذعية تعمل تحت
              مظلة ريف.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-5 text-[13px] font-extrabold text-primary-foreground shadow-elevated hover:opacity-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            إنشاء واجهة جديدة
          </Button>
        </div>
      </motion.section>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassKpiCard label="لوحات الكاشير النشطة" value={12} accent="emerald" icon={MonitorSmartphone} />
        <GlassKpiCard label="السائقون المتصلون" value={34} accent="sky" icon={Truck} />
        <GlassKpiCard label="تجار في الشبكة" value={87} accent="amber" icon={Store} />
        <GlassKpiCard label="وحدات DNA مفعّلة" value={9} accent="violet" icon={Sparkles} />
      </div>

      {/* Stem cells */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Stem Cells"
          title="الخلايا الجذعية للمصنع"
          description="كل بطاقة تمثّل قالباً قابلاً للنسخ لإنشاء بيئة عمل جديدة داخل ريف."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEM_CELLS.map((cell, i) => {
            const Icon = cell.icon;
            return (
              <motion.div
                key={cell.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}
              >
                <Link
                  to={cell.to}
                  className="group glass-steel relative block overflow-hidden rounded-3xl p-5 shadow-soft transition hover:shadow-elevated"
                >
                  <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", cell.accent)} />
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-elevated",
                        cell.accent,
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[16px] font-extrabold tracking-tight">
                        {cell.name}
                      </h3>
                      <p className="mt-0.5 text-[11.5px] text-foreground/60">{cell.description}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  {cell.badge && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/40 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
                      {cell.badge}
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ReefAppFactory;
