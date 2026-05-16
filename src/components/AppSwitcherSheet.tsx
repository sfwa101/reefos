/**
 * AppSwitcherSheet — Apple-grade launcher.
 *
 * Triggered from the top-header notch. Lists every Salsabil civilization
 * (apps) and, for users carrying operator roles, the matching admin panels
 * grouped by the company that owns them. A "Set as default" pin lets the
 * user choose a launch surface that the root bootstrap honors on startup.
 *
 * Mobile-first: bottom sheet on phones, centered glass card on ≥md.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OS_COMPANIES, STATUS_META, type OSCompany, type OSCompanyId } from "@/core/identity/osCompanies";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  readDefaultLauncher,
  writeDefaultLauncher,
  isDefaultLauncher,
  type DefaultLauncher,
} from "@/lib/defaultLauncher";
import { Check, Pin, PinOff, ChevronLeft, Sparkles, LayoutGrid } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

/** App entries with their target route on the storefront. */
const APP_ROUTES: Record<OSCompanyId, string> = {
  global: "/admin/hub",
  reef: "/",
  hakim: "/hakim",
  tayseer: "/account",
  noor_eldin: "/library",
  family: "/family",
  maeen: "/maeen",
  khalil: "/khalil",
  asrab: "/asrab",
  nabd: "/nabd",
};

type AdminPanel = {
  id: string;
  company: OSCompanyId;
  label: string;
  path: string;
  role: NonNullable<AppRole> | "*";
};

const ADMIN_PANELS: ReadonlyArray<AdminPanel> = [
  // ريف المدينة
  { id: "reef.admin",    company: "reef", label: "لوحة الإدارة",   path: "/admin",    role: "admin" },
  { id: "reef.finance",  company: "reef", label: "المالية",         path: "/admin/finance", role: "finance" },
  { id: "reef.branch",   company: "reef", label: "مدير الفرع",      path: "/admin",    role: "branch_manager" },
  { id: "reef.store",    company: "reef", label: "مدير المتجر",     path: "/admin",    role: "store_manager" },
  { id: "reef.vendor",   company: "reef", label: "تاجر / بائع",     path: "/vendor",   role: "vendor" },
  { id: "reef.cashier",  company: "reef", label: "نقطة البيع",      path: "/pos",      role: "cashier" },
  { id: "reef.driver",   company: "reef", label: "السائق",          path: "/driver",   role: "delivery" },
  { id: "reef.staff",    company: "reef", label: "الموظف",          path: "/employee", role: "staff" },
  // Motherboard
  { id: "global.hub",    company: "global", label: "لوحة السيادة",  path: "/admin/hub", role: "admin" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSwitcherSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { roles } = useUserRoles();
  const [pinTick, setPinTick] = useState(0); // force re-read of localStorage
  const current = useMemo<DefaultLauncher | null>(() => readDefaultLauncher(), [pinTick]);

  const apps = OS_COMPANIES;
  const visiblePanels = useMemo(
    () => ADMIN_PANELS.filter((p) => p.role === "*" || roles.includes(p.role as NonNullable<AppRole>)),
    [roles],
  );

  const panelsByCompany = useMemo(() => {
    const map = new Map<OSCompanyId, AdminPanel[]>();
    for (const p of visiblePanels) {
      const arr = map.get(p.company) ?? [];
      arr.push(p);
      map.set(p.company, arr);
    }
    return map;
  }, [visiblePanels]);

  const go = (path: string) => {
    onOpenChange(false);
    // small defer so the sheet exit animation can start
    setTimeout(() => navigate({ to: path }), 60);
  };

  const togglePinApp = (c: OSCompany) => {
    const candidate = { kind: "app" as const, id: c.id };
    if (isDefaultLauncher(current, candidate)) {
      writeDefaultLauncher(null);
    } else {
      writeDefaultLauncher({
        kind: "app",
        id: c.id,
        name: c.name,
        path: APP_ROUTES[c.id] ?? "/",
      });
    }
    setPinTick((n) => n + 1);
  };

  const togglePinPanel = (p: AdminPanel, companyName: string) => {
    const candidate = { kind: "panel" as const, id: p.id };
    if (isDefaultLauncher(current, candidate)) {
      writeDefaultLauncher(null);
    } else {
      writeDefaultLauncher({
        kind: "panel",
        id: p.id,
        name: `${companyName} · ${p.label}`,
        path: p.path,
      });
    }
    setPinTick((n) => n + 1);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className={cn(
          "max-h-[88vh] overflow-y-auto rounded-t-[32px] border-t-0 px-0 pb-[max(24px,env(safe-area-inset-bottom))] pt-3",
          "bg-background/85 backdrop-blur-2xl",
          "md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:max-w-[560px]",
          "md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[32px] md:border md:border-border/60",
        )}
      >
        {/* Grabber */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30 md:hidden" />

        <SheetHeader className="px-5 text-right">
          <SheetTitle className="flex items-center justify-between gap-3 font-display text-[20px] font-extrabold tracking-tight">
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" strokeWidth={2.4} />
              مبدّل التطبيقات
            </span>
            {current && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10.5px] font-extrabold text-primary">
                <Pin className="h-3 w-3" />
                {current.name}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-muted-foreground">
            اختر تطبيقاً للانتقال إليه أو ثبّت لوحة كافتراضية عند بدء التشغيل.
          </SheetDescription>
        </SheetHeader>

        {/* APPS GRID */}
        <section className="px-5 pt-4">
          <h3 className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
            التطبيقات
          </h3>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {apps.map((c) => {
              const Icon = c.icon;
              const isDefault = isDefaultLauncher(current, { kind: "app", id: c.id });
              const status = STATUS_META[c.status];
              return (
                <motion.div
                  key={c.id}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-3xl p-3 text-center",
                    "bg-card/70 ring-1 ring-border/50 backdrop-blur-xl",
                    "transition hover:bg-card",
                    isDefault && "ring-2 ring-primary/70",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => go(APP_ROUTES[c.id] ?? "/")}
                    className="flex w-full flex-col items-center gap-2 outline-none"
                    aria-label={`فتح ${c.name}`}
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br text-white shadow-elevated",
                        c.accent,
                      )}
                    >
                      <Icon className="h-7 w-7" strokeWidth={2.2} />
                    </div>
                    <span className="line-clamp-1 text-[11.5px] font-extrabold leading-tight">
                      {c.name}
                    </span>
                    <span className={cn("inline-flex h-1.5 w-1.5 rounded-full", status.dot)} />
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePinApp(c)}
                    aria-label={isDefault ? "إلغاء التثبيت" : "تعيين كافتراضي"}
                    className={cn(
                      "absolute end-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full",
                      "bg-background/80 text-muted-foreground ring-1 ring-border/60 backdrop-blur",
                      "opacity-0 transition group-hover:opacity-100",
                      isDefault && "bg-primary text-primary-foreground opacity-100 ring-primary",
                    )}
                  >
                    {isDefault ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ADMIN PANELS */}
        <AnimatePresence>
          {visiblePanels.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 pt-5"
            >
              <h3 className="mb-2 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                لوحات الإدارة
              </h3>

              <div className="space-y-3">
                {Array.from(panelsByCompany.entries()).map(([companyId, list]) => {
                  const company = OS_COMPANIES.find((c) => c.id === companyId);
                  if (!company) return null;
                  const Icon = company.icon;
                  return (
                    <div
                      key={companyId}
                      className="rounded-3xl border border-border/50 bg-card/60 p-3 backdrop-blur-xl"
                    >
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                            company.accent,
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                        </div>
                        <span className="text-[12.5px] font-extrabold">{company.name}</span>
                      </div>

                      <ul className="space-y-1.5">
                        {list.map((p) => {
                          const isDefault = isDefaultLauncher(current, { kind: "panel", id: p.id });
                          return (
                            <li key={p.id}>
                              <div
                                className={cn(
                                  "flex items-center gap-2 rounded-2xl px-2.5 py-2 text-right transition",
                                  "bg-background/70 ring-1 ring-border/40",
                                  isDefault && "ring-2 ring-primary/60 bg-primary/5",
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => go(p.path)}
                                  className="flex flex-1 items-center justify-between gap-2 text-right"
                                >
                                  <span className="text-[13px] font-bold">{p.label}</span>
                                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => togglePinPanel(p, company.name)}
                                  aria-label={isDefault ? "إلغاء التثبيت" : "تعيين كافتراضي"}
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full",
                                    "text-muted-foreground ring-1 ring-border/60",
                                    isDefault && "bg-primary text-primary-foreground ring-primary",
                                  )}
                                >
                                  {isDefault ? <Check className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <p className="px-5 pt-4 text-center text-[10.5px] text-muted-foreground">
          سيتم استخدام التطبيق أو اللوحة المثبّتة تلقائياً عند فتح التطبيق.
        </p>
      </SheetContent>
    </Sheet>
  );
}

export default AppSwitcherSheet;
