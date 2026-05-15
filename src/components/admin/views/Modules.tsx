/**
 * Modules & Engines — /admin/modules
 *
 * Sovereign Capability Surface. Reads the dynamic registry at
 * `src/core/system/capabilities/registry.ts` and renders a 6-tab glass
 * dashboard exposing every active engine/gateway in the civilization.
 *
 * Live metrics (e.g. offline queue depth) are hydrated from read-only
 * client gateways (`offlineQueueSize`) — zero `supabase.from()` here.
 */
import { useEffect, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";
import { useReefMode } from "@/core/identity/useReefMode";
import {
  TAB_META,
  getCapabilitiesByTab,
  type Capability,
  type CapabilityTab,
} from "@/core/system/capabilities/registry";
import { offlineQueueSize } from "@/lib/offlineSyncQueue";

const SettingsView = lazy(() => import("@/components/admin/views/Settings"));

const TAB_ORDER: CapabilityTab[] = [
  "core",
  "factory",
  "hakim",
  "governance",
  "tools",
  "settings",
];

const STATUS_LABEL: Record<Capability["status"], string> = {
  live: "نشط",
  standby: "احتياطي",
  beta: "تجريبي",
};

const STATUS_DOT: Record<Capability["status"], string> = {
  live: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]",
  standby: "bg-zinc-400 shadow-[0_0_0_4px_rgba(161,161,170,0.18)]",
  beta: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]",
};

function useOfflineQueueSize() {
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const n = await offlineQueueSize();
        if (mounted) setSize(n);
      } catch {
        if (mounted) setSize(0);
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);
  return size;
}

function TabPill({
  tab,
  active,
  onClick,
}: {
  tab: CapabilityTab;
  active: boolean;
  onClick: () => void;
}) {
  const meta = TAB_META[tab];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-[12.5px] font-extrabold transition ${
        active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId="modulesActiveTab"
          className="absolute inset-0 rounded-2xl bg-primary shadow-steel-soft"
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        />
      )}
      <Icon className="relative h-4 w-4" strokeWidth={2.4} />
      <span className="relative whitespace-nowrap">{meta.title}</span>
    </button>
  );
}

function CapabilityCard({
  capability,
  metric,
}: {
  capability: Capability;
  metric?: number | null;
}) {
  const Icon = capability.icon;
  const showMetric = capability.metricKey === "offlineQueueSize";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-steel relative overflow-hidden rounded-3xl p-5 shadow-steel-soft transition"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${capability.accent} opacity-70`}
      />
      <div className="relative flex flex-col gap-3 text-right">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-foreground shadow-elevated backdrop-blur">
            <Icon className="h-5 w-5" strokeWidth={2.3} />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-foreground/80 backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[capability.status]}`} />
              {STATUS_LABEL[capability.status]}
            </span>
            {showMetric && (
              <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-[10.5px] font-extrabold text-background">
                {metric ?? "…"} في الانتظار
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="font-display text-[15px] font-extrabold text-foreground">
            {capability.title}
          </p>
          <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-foreground/70">
            {capability.description}
          </p>
        </div>
        <code
          dir="ltr"
          className="truncate rounded-xl bg-white/50 px-2 py-1 text-[10.5px] font-medium text-foreground/60 backdrop-blur"
          title={capability.source}
        >
          {capability.source}
        </code>
      </div>
    </motion.div>
  );
}

export default function Modules() {
  const [tab, setTab] = useState<CapabilityTab>("core");
  const activeOSId = useActiveOSCompany((s) => s.activeId);
  const reefMode = useReefMode((s) => s.mode);
  const offlineSize = useOfflineQueueSize();

  const eyebrow =
    activeOSId === "global"
      ? "Salsabil OS"
      : reefMode === "factory"
        ? "Reef Al Madina · Factory"
        : "Reef Al Madina · ERP";

  const capabilities = getCapabilitiesByTab(tab);
  const meta = TAB_META[tab];

  return (
    <div className="bg-mesh space-y-6">
      <SectionHeader
        eyebrow={eyebrow}
        title="الوحدات والمحركات"
        description="مركز قيادة الخلايا التشغيلية والمحركات السيادية، مع وصول مباشر لكل قدرة نشطة."
      />

      <div className="glass-steel-strong sticky top-2 z-10 -mx-1 overflow-x-auto rounded-3xl p-1.5">
        <div className="flex items-center gap-1">
          {TAB_ORDER.map((t) => (
            <TabPill key={t} tab={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>
      </div>

      <div className="glass-steel relative overflow-hidden rounded-3xl p-4 shadow-steel-soft">
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.accent} opacity-50`}
        />
        <div className="relative flex items-center gap-3 text-right">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 backdrop-blur">
            <meta.icon className="h-5 w-5" strokeWidth={2.3} />
          </div>
          <div>
            <p className="font-display text-[15px] font-extrabold">{meta.title}</p>
            <p className="text-[12.5px] font-medium text-foreground/70">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          {capabilities.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {capabilities.map((cap) => (
                <CapabilityCard
                  key={cap.id}
                  capability={cap}
                  metric={cap.metricKey === "offlineQueueSize" ? offlineSize : null}
                />
              ))}
            </div>
          ) : (
            <div className="glass-steel rounded-3xl p-8 text-center text-sm text-foreground/60 shadow-steel-soft">
              لا توجد قدرات نشطة في هذا التبويب بعد.
            </div>
          )}

          {tab === "settings" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="glass-steel-strong rounded-3xl p-2 shadow-steel-soft sm:p-4"
            >
              <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
                <SettingsView />
              </Suspense>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
