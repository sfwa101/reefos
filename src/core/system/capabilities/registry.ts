/**
 * Sovereign Capabilities Registry — read-only map of active engines/gateways
 * discovered across `src/core/`, `src/lib/`, and `src/integrations/`.
 *
 * UI surfaces (e.g. `/admin/modules`) import this registry to render
 * dynamic micro-OS cards instead of hardcoding lists. Status is treated as
 * a static manifest; live counters (e.g. offline queue size) are fetched
 * separately by the consumer via dedicated read-only gateways.
 *
 * NOTE: zero `supabase.from(...)` calls here — this file is pure metadata.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  CloudOff,
  Cog,
  Database,
  Factory,
  Fingerprint,
  GitBranch,
  Layers3,
  Lock,
  MessageSquare,
  Package,
  Printer,
  Radar,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react";

export type CapabilityTab =
  | "core"
  | "factory"
  | "hakim"
  | "governance"
  | "tools"
  | "settings";

export type CapabilityStatus = "live" | "standby" | "beta";

export type Capability = {
  id: string;
  tab: CapabilityTab;
  title: string;
  description: string;
  icon: LucideIcon;
  status: CapabilityStatus;
  /** Path inside `src/` where the engine is implemented (for traceability). */
  source: string;
  /** Optional live metric key the UI will hydrate (e.g. offline queue size). */
  metricKey?: "offlineQueueSize";
  /** Optional accent gradient (tailwind class fragment). */
  accent: string;
};

export const TAB_META: Record<
  CapabilityTab,
  { title: string; subtitle: string; icon: LucideIcon; accent: string }
> = {
  core: {
    title: "النواة التشغيلية",
    subtitle: "محركات الطلبات، المخزون، والمالية المتصلة بالـ Gateways.",
    icon: Database,
    accent: "from-sky-400/30 to-indigo-500/20",
  },
  factory: {
    title: "مصنع التطبيقات",
    subtitle: "خلايا جذعية لإنتاج واجهات POS / KDS / Driver عند الطلب.",
    icon: Layers3,
    accent: "from-emerald-400/30 to-teal-500/20",
  },
  hakim: {
    title: "محرّك حكيم",
    subtitle: "بصيرة، تنبؤ، ومخططات تنفيذية فورية للقرارات الإدارية.",
    icon: Sparkles,
    accent: "from-fuchsia-400/30 to-violet-500/20",
  },
  governance: {
    title: "الحوكمة والامتثال",
    subtitle: "صلاحيات، ربا أودِت، وسجلات تتبّع للقرارات الحساسة.",
    icon: ShieldCheck,
    accent: "from-amber-400/30 to-orange-500/20",
  },
  tools: {
    title: "أدوات الصيانة",
    subtitle: "إعادة فهرسة، تنظيف ذاكرة، ومُنشّطات الخلفية.",
    icon: Wrench,
    accent: "from-rose-400/30 to-pink-500/20",
  },
  settings: {
    title: "الإعدادات السيادية",
    subtitle: "متغيرات النظام، العملة، الضرائب، والشحن.",
    icon: Cog,
    accent: "from-slate-400/30 to-zinc-500/20",
  },
};

export const SOVEREIGN_CAPABILITIES: Capability[] = [
  // ───────────── Core ─────────────
  {
    id: "offline-replay",
    tab: "core",
    title: "محرك إعادة المزامنة دون اتصال",
    description:
      "صف IndexedDB دائم يحمي الكاشير والسائقين من انقطاع الشبكة بإعادة تشغيل العمليات تلقائياً.",
    icon: CloudOff,
    status: "live",
    source: "src/lib/offlineSyncQueue.ts",
    metricKey: "offlineQueueSize",
    accent: "from-cyan-400/30 to-sky-500/20",
  },
  {
    id: "taysir-identity",
    tab: "core",
    title: "محرك الهوية المتكيف (تيسير)",
    description:
      "حقن JWT تلقائي عبر `attachSupabaseAuth` لكل استدعاء serverFn مع ترقية صلاحيات سياقية.",
    icon: Fingerprint,
    status: "live",
    source: "src/integrations/supabase/auth-attacher.ts",
    accent: "from-indigo-400/30 to-violet-500/20",
  },
  {
    id: "double-entry-finance",
    tab: "core",
    title: "محرك القيد المزدوج",
    description:
      "نظرة شاملة على الإيرادات، التزامات الشركاء، والأرباح الصافية عبر `getFinanceOverviewFn`.",
    icon: Wallet,
    status: "live",
    source: "src/core/finance/finance.functions.ts",
    accent: "from-emerald-400/30 to-teal-500/20",
  },
  {
    id: "inventory-ledger",
    tab: "core",
    title: "دفتر حركة المخزون",
    description:
      "أحداث حجوزات وتثبيت سرّية عبر `appendLedgerEventFn` مع تنظيف ذكي للحجوزات المنتهية.",
    icon: Package,
    status: "live",
    source: "src/core/inventory/gateway/inventory.functions.ts",
    accent: "from-amber-400/30 to-orange-500/20",
  },

  // ───────────── Factory ─────────────
  {
    id: "factory-blueprint",
    tab: "factory",
    title: "مخطّط الخلايا الجذعية",
    description:
      "بناء واجهات POS/KDS/Driver عبر معالج حكيم 4-مراحل (Hakim Architect).",
    icon: Factory,
    status: "live",
    source: "src/components/admin/views/ReefFactoryBuilder.tsx",
    accent: "from-emerald-400/30 to-lime-500/20",
  },
  {
    id: "factory-deploy",
    tab: "factory",
    title: "نشر بيئات العمل",
    description:
      "تهيئة Workspaces داخل ريف المدينة دون لمس قاعدة الشركة الأم سلسبيل.",
    icon: GitBranch,
    status: "beta",
    source: "src/components/admin/views/ReefAppFactory.tsx",
    accent: "from-teal-400/30 to-cyan-500/20",
  },

  // ───────────── Hakim ─────────────
  {
    id: "hakim-stream",
    tab: "hakim",
    title: "بثّ SSE الاستشاري",
    description:
      "محادثة لحظية مع حكيم عبر بوابة Lovable AI و serverFn streaming generator.",
    icon: MessageSquare,
    status: "live",
    source: "src/routes/api/hakim-chat.ts",
    accent: "from-fuchsia-400/30 to-pink-500/20",
  },
  {
    id: "behavior-memory",
    tab: "hakim",
    title: "ذاكرة السلوك التكيفية",
    description:
      "تتبع نوايا المستخدم وتغذية محرك التقارب بين الفئات لتخصيص العرض.",
    icon: Brain,
    status: "live",
    source: "src/core/events/behavior.ts",
    accent: "from-violet-400/30 to-purple-500/20",
  },

  // ───────────── Governance ─────────────
  {
    id: "sovereign-tracing",
    tab: "governance",
    title: "خط زمني الأحداث السيادي",
    description:
      "إلحاق غير قابل للتعديل في `salsabil_event_timeline` عبر `log_sovereign_event` RPC.",
    icon: ScrollText,
    status: "live",
    source: "src/core/system/observability/SovereignTracingGateway.ts",
    accent: "from-amber-400/30 to-yellow-500/20",
  },
  {
    id: "rls-watchdog",
    tab: "governance",
    title: "حارس RLS التشخيصي",
    description:
      "كاشف تجاوزات Supabase في وضع التطوير، يقطع الدائرة عند الاشتباه.",
    icon: Radar,
    status: "live",
    source: "src/core/runtime-ui/watchdog.ts",
    accent: "from-orange-400/30 to-rose-500/20",
  },
  {
    id: "session-audit",
    tab: "governance",
    title: "تدقيق الجلسات والصلاحيات",
    description:
      "أدوار قائمة على `has_role` SECURITY DEFINER وتسجيل دوري للقرارات الحساسة.",
    icon: Lock,
    status: "live",
    source: "src/integrations/supabase/auth-middleware.ts",
    accent: "from-yellow-400/30 to-amber-500/20",
  },

  // ───────────── Tools ─────────────
  {
    id: "nested-stock",
    tab: "tools",
    title: "تحليل المخزون المُركّب",
    description:
      "تفكيك تركيبي عميق للحزم والأصناف الفرعية عبر `getNestedStockBreakdownFn`.",
    icon: Layers3,
    status: "live",
    source: "src/core/ops/ops.functions.ts",
    accent: "from-rose-400/30 to-pink-500/20",
  },
  {
    id: "print-wizard",
    tab: "tools",
    title: "محرك الطباعة الموزّع",
    description:
      "طوابير طباعة الفواتير والملصقات عبر مسار `/admin/print-jobs`.",
    icon: Printer,
    status: "live",
    source: "src/routes/admin.print-jobs.tsx",
    accent: "from-pink-400/30 to-fuchsia-500/20",
  },

  // ───────────── Settings ─────────────
  {
    id: "system-settings",
    tab: "settings",
    title: "الإعدادات البيئية",
    description:
      "متغيرات النظام، العملة، نسب الضريبة، وقواعد الشحن في غلاف زجاجي.",
    icon: SettingsIcon,
    status: "live",
    source: "src/components/admin/views/Settings.tsx",
    accent: "from-slate-400/30 to-zinc-500/20",
  },
  {
    id: "system-pulse",
    tab: "settings",
    title: "نبضة النظام",
    description:
      "تيار `Tracer.info/warn/error` كـ Single Source of Truth للملاحظة الزمنية.",
    icon: Activity,
    status: "live",
    source: "src/core/system/observability/Tracer.ts",
    accent: "from-zinc-400/30 to-slate-500/20",
  },
];

export const getCapabilitiesByTab = (tab: CapabilityTab): Capability[] =>
  SOVEREIGN_CAPABILITIES.filter((c) => c.tab === tab);
