/**
 * OS Companies Catalog — Sovereign Switcher source of truth.
 *
 * Pure data module describing the Salsabil OS multi-civilization roster:
 * the Motherboard ("global") and every child company. UI components
 * (SovereignSwitcher, OSHome, sidebars) consume this list — no DB calls,
 * no hardcoded literals scattered across the codebase.
 */
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  Factory,
  Globe2,
  HeartPulse,
  Home,
  Library,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

export type OSCompanyStatus = "live" | "building" | "design";

export type OSCompanyId =
  | "global"
  | "reef"
  | "tayseer"
  | "hakim"
  | "noor_eldin"
  | "khalil"
  | "asrab"
  | "nabd"
  | "family";

export interface OSCompany {
  id: OSCompanyId;
  name: string;
  tagline: string;
  status: OSCompanyStatus;
  icon: LucideIcon;
  /** Tailwind gradient classes used for the avatar halo. */
  accent: string;
  /** Whether selecting this morphs the live workspace context. */
  workspaceKind?: "global" | "reef" | "tayseer" | "noor_eldin" | "family";
}

export const OS_COMPANIES: ReadonlyArray<OSCompany> = [
  {
    id: "global",
    name: "Salsabil OS",
    tagline: "اللوحة الأم — الحضارة السيادية",
    status: "live",
    icon: Globe2,
    accent: "from-indigo-500 via-purple-500 to-fuchsia-500",
    workspaceKind: "global",
  },
  {
    id: "reef",
    name: "ريف المدينة",
    tagline: "السوق الذكي · ERP كامل",
    status: "live",
    icon: Store,
    accent: "from-emerald-500 to-teal-500",
    workspaceKind: "reef",
  },
  {
    id: "hakim",
    name: "حكيم",
    tagline: "محرك الذكاء السيادي",
    status: "live",
    icon: Sparkles,
    accent: "from-amber-400 to-orange-500",
  },
  {
    id: "tayseer",
    name: "تيسير",
    tagline: "الهوية والمحفظة المالية",
    status: "building",
    icon: ShieldCheck,
    accent: "from-sky-500 to-blue-600",
    workspaceKind: "tayseer",
  },
  {
    id: "noor_eldin",
    name: "نور الدين",
    tagline: "المنصة المعرفية الإسلامية",
    status: "building",
    icon: Library,
    accent: "from-amber-500 to-yellow-600",
    workspaceKind: "noor_eldin",
  },
  {
    id: "family",
    name: "العائلة",
    tagline: "إدارة الأسرة والمصاريف",
    status: "building",
    icon: Home,
    accent: "from-rose-400 to-pink-600",
    workspaceKind: "family",
  },
  {
    id: "khalil",
    name: "خليل",
    tagline: "السوبر-أب الموحد",
    status: "design",
    icon: Users,
    accent: "from-violet-500 to-purple-600",
  },
  {
    id: "asrab",
    name: "أسراب طيبة",
    tagline: "العقارات والسفر والحج",
    status: "design",
    icon: Building2,
    accent: "from-cyan-500 to-sky-600",
  },
  {
    id: "nabd",
    name: "نبض الحياة",
    tagline: "الصحة والصيدلة الذكية",
    status: "design",
    icon: HeartPulse,
    accent: "from-red-500 to-rose-600",
  },
];

export const STATUS_META: Record<OSCompanyStatus, { label: string; dot: string; chip: string }> = {
  live: {
    label: "حي",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  building: {
    label: "قيد البناء",
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  design: {
    label: "تصميم",
    dot: "bg-slate-400",
    chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  },
};

export const OS_MODULES: ReadonlyArray<{
  id: string;
  name: string;
  domain: string;
  icon: LucideIcon;
  shared_by: ReadonlyArray<OSCompanyId>;
}> = [
  {
    id: "identity",
    name: "الهوية والصلاحيات",
    domain: "Identity",
    icon: ShieldCheck,
    shared_by: ["global", "reef", "tayseer", "khalil"],
  },
  {
    id: "wallet",
    name: "المحفظة المالية",
    domain: "Finance",
    icon: Activity,
    shared_by: ["tayseer", "reef", "khalil"],
  },
  {
    id: "catalog",
    name: "الكتالوج العالمي",
    domain: "Commerce",
    icon: Store,
    shared_by: ["reef", "khalil", "asrab"],
  },
  {
    id: "hakim_ai",
    name: "محرك حكيم",
    domain: "AI",
    icon: Sparkles,
    shared_by: ["global", "reef", "hakim"],
  },
  {
    id: "logistics",
    name: "اللوجستيات",
    domain: "Operations",
    icon: Factory,
    shared_by: ["reef", "asrab", "nabd"],
  },
  {
    id: "library",
    name: "مكتبة المعرفة",
    domain: "Knowledge",
    icon: Library,
    shared_by: ["noor_eldin", "global"],
  },
];

export function getOSCompany(id: OSCompanyId): OSCompany {
  return OS_COMPANIES.find((c) => c.id === id) ?? OS_COMPANIES[0];
}
