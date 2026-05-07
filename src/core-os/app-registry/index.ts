/**
 * Salsabil OS — Mini-App Registry (Phase VIII)
 * --------------------------------------------
 * Single source of truth for every Sovereign Super-App that runs inside the
 * Salsabil OS shell. Internal departments of a Super-App (e.g. Reef's
 * Baskets / Meat / Village) MUST NOT be registered here — they are routes
 * inside Reef Al-Madina, not sibling Super-Apps.
 *
 * Adding a new Super-App = append a manifest entry. Zero hardcoding in the UI.
 */
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { ShoppingBasket, Plane, HeartPulse, Sparkles } from "lucide-react";
import type { SalsabilAppId } from "@/core-os/event-bus";

export type MiniAppVisibilityCtx = {
  userId: string | null;
  hasActiveDelivery?: boolean;
  hasActiveTrip?: boolean;
};

export type MiniAppManifest = {
  id: SalsabilAppId | string;
  name: string;
  tagline?: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  route: string;
  /** Tailwind gradient ramp e.g. "from-emerald-500 to-teal-600" */
  accent: string;
  status: "live" | "beta" | "soon";
  /** Pure predicate — must NOT trigger network. Returns true if visible. */
  visibility_logic?: (ctx: MiniAppVisibilityCtx) => boolean;
};

const REGISTRY: MiniAppManifest[] = [
  {
    id: "reef",
    name: "ريف المدينة",
    tagline: "متجرك اليومي",
    icon: ShoppingBasket,
    route: "/",
    accent: "from-emerald-500 to-teal-600",
    status: "live",
    visibility_logic: () => true,
  },
  {
    id: "asrab",
    name: "أسراب طيبة",
    tagline: "السفر والرحلات",
    icon: Plane,
    route: "/asrab",
    accent: "from-sky-500 to-indigo-600",
    status: "soon",
    visibility_logic: () => true,
  },
  {
    id: "nabd",
    name: "نبض الحياة",
    tagline: "صحتك أولاً",
    icon: HeartPulse,
    route: "/nabd",
    accent: "from-rose-500 to-pink-600",
    status: "soon",
    visibility_logic: () => true,
  },
  {
    id: "maeen",
    name: "معين",
    tagline: "بوابة الإمبراطورية الموحدة",
    icon: Sparkles,
    route: "/maeen",
    accent: "from-amber-500 to-orange-600",
    status: "live",
    visibility_logic: () => true,
  },
];

export const appRegistry = {
  list(ctx: MiniAppVisibilityCtx): MiniAppManifest[] {
    return REGISTRY.filter((m) => (m.visibility_logic ? m.visibility_logic(ctx) : true));
  },
  get(id: string): MiniAppManifest | undefined {
    return REGISTRY.find((m) => m.id === id);
  },
  all(): MiniAppManifest[] {
    return REGISTRY.slice();
  },
};
