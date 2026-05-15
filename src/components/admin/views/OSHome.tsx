/**
 * OSHome — Salsabil OS Motherboard.
 *
 * Central hub shown at `/admin/os` when the Sovereign Switcher selects
 * the "global" civilization. Surfaces:
 *  • Civilization roster (cross-link into each child company).
 *  • Global DNA Library (shared modules / capabilities matrix).
 *  • Insights + Governance shortcuts.
 */
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import {
  OS_COMPANIES,
  OS_MODULES,
  STATUS_META,
  getOSCompany,
} from "@/core/identity/osCompanies";
import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";

export function OSHome() {
  const setActive = useActiveOSCompany((s) => s.setActive);

  const live = OS_COMPANIES.filter((c) => c.status === "live").length;
  const building = OS_COMPANIES.filter((c) => c.status === "building").length;
  const design = OS_COMPANIES.filter((c) => c.status === "design").length;

  return (
    <div className="space-y-6 lg:space-y-8" dir="rtl">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="glass-steel-strong relative overflow-hidden rounded-3xl p-6 lg:p-8 shadow-elevated"
      >
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/40 via-purple-400/30 to-fuchsia-400/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> Salsabil OS · Motherboard
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
              لوحة الحضارة السيادية
            </h1>
            <p className="mt-1 max-w-xl text-sm text-foreground/70">
              من هنا تنبض كل شركات Salsabil — تتحكم بالـ DNA المشترك،
              توزّع الوحدات، وتراقب الحضارة بأكملها.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <Stat label="حية" value={live} dot="bg-emerald-500" />
            <Stat label="قيد البناء" value={building} dot="bg-amber-500" />
            <Stat label="تصميم" value={design} dot="bg-slate-400" />
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <Tabs defaultValue="dna" className="space-y-4">
        <TabsList className="glass-steel mx-auto flex w-full max-w-md justify-between rounded-2xl p-1.5">
          <TabsTrigger value="dna" className="flex-1 rounded-xl text-[12.5px] font-extrabold">
            مكتبة DNA
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex-1 rounded-xl text-[12.5px] font-extrabold">
            الشركات
          </TabsTrigger>
          <TabsTrigger value="governance" className="flex-1 rounded-xl text-[12.5px] font-extrabold">
            الحوكمة
          </TabsTrigger>
        </TabsList>

        {/* DNA Library */}
        <TabsContent value="dna" className="space-y-4">
          <SectionHeader
            eyebrow="Global DNA"
            title="الوحدات المشتركة"
            subtitle="القدرات الجذعية المتاحة لكل شركات Salsabil OS"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OS_MODULES.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 260, damping: 22 }}
                  className="group glass-steel relative overflow-hidden rounded-3xl p-5 shadow-soft transition hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elevated">
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <span className="rounded-full bg-white/50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground backdrop-blur-md">
                      {m.domain}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-[16px] font-extrabold tracking-tight">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-foreground/60">
                    مُستخدم في {m.shared_by.length} شركات
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.shared_by.map((sid) => {
                      const c = getOSCompany(sid);
                      return (
                        <span
                          key={sid}
                          className={cn(
                            "rounded-full bg-gradient-to-r px-2 py-0.5 text-[9.5px] font-extrabold text-white shadow-sm",
                            c.accent,
                          )}
                          title={c.name}
                        >
                          {c.name}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Roster */}
        <TabsContent value="roster" className="space-y-4">
          <SectionHeader
            eyebrow="Civilization"
            title="شركات الحضارة"
            subtitle="انقر لتفعيل أي شركة كسياق نشط"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OS_COMPANIES.map((c, i) => {
              const Icon = c.icon;
              const status = STATUS_META[c.status];
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 22 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group glass-steel relative overflow-hidden rounded-3xl p-5 text-right shadow-soft transition hover:shadow-elevated"
                >
                  <div
                    className={cn(
                      "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                      c.accent,
                    )}
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-elevated",
                        c.accent,
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[16px] font-extrabold tracking-tight truncate">
                        {c.name}
                      </h3>
                      <p className="text-[11.5px] text-foreground/60 truncate">
                        {c.tagline}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold",
                        status.chip,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                      {status.label}
                    </span>
                    {c.workspaceKind && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Workspace
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </TabsContent>

        {/* Governance */}
        <TabsContent value="governance" className="space-y-4">
          <SectionHeader
            eyebrow="Governance"
            title="مراكز التحكم السيادية"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <GovCard to="/admin/control-plane" title="مستوى التحكم" subtitle="Control Plane" />
            <GovCard to="/admin/audit-log" title="سجل التدقيق" subtitle="Audit Log" />
            <GovCard to="/admin/role-permissions" title="الأدوار والصلاحيات" subtitle="RBAC" />
            <GovCard to="/admin/sovereign-treasury" title="الخزينة السيادية" subtitle="Treasury" />
            <GovCard to="/admin/tracing" title="التتبع السيادي" subtitle="Tracing" />
            <GovCard to="/admin/system-settings" title="إعدادات النظام" subtitle="System" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-center backdrop-blur-md">
      <div className="flex items-center justify-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="font-display text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function GovCard({ to, title, subtitle }: { to: string; title: string; subtitle: string }) {
  return (
    <Link
      to={to}
      className="group glass-steel flex items-center justify-between rounded-3xl p-5 shadow-soft transition hover:shadow-elevated"
    >
      <div>
        <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {subtitle}
        </p>
        <p className="font-display text-[15px] font-extrabold tracking-tight">
          {title}
        </p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-[-2px] group-hover:text-primary" />
    </Link>
  );
}

export default OSHome;
