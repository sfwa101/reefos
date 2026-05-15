/**
 * Modules & Engines — /admin/modules
 *
 * WAVE UI-13.5 — replaces the standalone "Settings" anchor in the mobile
 * bottom nav. Surfaces the orchestration cells (modules / engines) and
 * nests the Settings hub as a tab so admins keep full env control without
 * cluttering the shell.
 */
import { useState, lazy, Suspense } from "react";
import {
  Blocks,
  Boxes,
  Cog,
  Layers3,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";
import { useReefMode } from "@/core/identity/useReefMode";

const SettingsView = lazy(() => import("@/components/admin/views/Settings"));

type TabId = "modules" | "settings";

type ModuleCell = {
  id: string;
  title: string;
  description: string;
  icon: typeof Blocks;
  accent: string;
};

const MODULE_CELLS: ModuleCell[] = [
  {
    id: "core",
    title: "النواة التشغيلية",
    description: "محركات الطلبات، المخزون، والمالية المتصلة بالـ Gateways السيادية.",
    icon: Boxes,
    accent: "from-sky-400/30 to-indigo-500/20",
  },
  {
    id: "factory",
    title: "مصنع التطبيقات",
    description: "خلايا جذعية لإنتاج واجهات POS / KDS / Driver عند الطلب.",
    icon: Layers3,
    accent: "from-emerald-400/30 to-teal-500/20",
  },
  {
    id: "hakim",
    title: "محرّك حكيم",
    description: "بصيرة، تنبؤ، ومخططات تنفيذية فورية للقرارات الإدارية.",
    icon: Sparkles,
    accent: "from-fuchsia-400/30 to-violet-500/20",
  },
  {
    id: "governance",
    title: "الحوكمة والامتثال",
    description: "صلاحيات، ربا أودِت، وسجلات تتبّع للقرارات الحساسة.",
    icon: ShieldCheck,
    accent: "from-amber-400/30 to-orange-500/20",
  },
  {
    id: "tools",
    title: "أدوات الصيانة",
    description: "إعادة فهرسة، تنظيف ذاكرة، ومُنشّطات الخلفية.",
    icon: Wrench,
    accent: "from-rose-400/30 to-pink-500/20",
  },
  {
    id: "settings",
    title: "الإعدادات السيادية",
    description: "متغيرات النظام، العملة، الضرائب، والشحن.",
    icon: Cog,
    accent: "from-slate-400/30 to-zinc-500/20",
  },
];

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Blocks;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-2xl px-4 py-2 text-[12.5px] font-extrabold transition ${
        active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      {active && (
        <motion.span
          layoutId="modulesActiveTab"
          className="absolute inset-0 rounded-2xl bg-primary shadow-steel-soft"
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        />
      )}
      <Icon className="relative h-4 w-4" strokeWidth={2.4} />
      <span className="relative">{label}</span>
    </button>
  );
}

export default function Modules() {
  const [tab, setTab] = useState<TabId>("modules");
  const activeOSId = useActiveOSCompany((s) => s.activeId);
  const reefMode = useReefMode((s) => s.mode);

  const eyebrow =
    activeOSId === "global"
      ? "Salsabil OS"
      : reefMode === "factory"
        ? "Reef Al Madina · Factory"
        : "Reef Al Madina · ERP";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={eyebrow}
        title="الوحدات والمحركات"
        description="مركز قيادة الخلايا التشغيلية والمحركات السيادية، مع وصول مباشر للإعدادات."
        action={
          <div className="glass-steel-strong inline-flex items-center gap-1 rounded-3xl p-1">
            <TabButton
              active={tab === "modules"}
              onClick={() => setTab("modules")}
              icon={Blocks}
              label="الوحدات"
            />
            <TabButton
              active={tab === "settings"}
              onClick={() => setTab("settings")}
              icon={SettingsIcon}
              label="الإعدادات"
            />
          </div>
        }
      />

      {tab === "modules" ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {MODULE_CELLS.map((cell) => {
            const Icon = cell.icon;
            return (
              <motion.button
                key={cell.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => cell.id === "settings" && setTab("settings")}
                className="glass-steel relative overflow-hidden rounded-3xl p-5 text-right shadow-steel-soft transition"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cell.accent} opacity-70`}
                />
                <div className="relative flex flex-col gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-foreground shadow-elevated backdrop-blur">
                    <Icon className="h-5 w-5" strokeWidth={2.3} />
                  </div>
                  <div>
                    <p className="font-display text-[15px] font-extrabold text-foreground">
                      {cell.title}
                    </p>
                    <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-foreground/70">
                      {cell.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-steel rounded-3xl p-2 shadow-steel-soft sm:p-4"
        >
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <SettingsView />
          </Suspense>
        </motion.div>
      )}
    </div>
  );
}
