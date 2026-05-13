/**
 * SovereignPersonaSwitcher — Phase 18 Part 2.
 *
 * The Imperial Persona Engine UI. Replaces the legacy hardcoded RoleSwitcher
 * with a Level-4 dual-surface component that:
 *   1. Reads available personas from `salsabil_persona_matrix` (Level-3 DB).
 *   2. Filters them by the user's `user_roles` + each persona's `role_predicates`.
 *   3. On selection, calls `setPersona(key)` → `useSovereignTheme` re-merges
 *      the persona's `theme_overlay` onto :root → instant DNA morph (Part 1).
 *   4. Routes the user to the persona's natural surface without a hard reload.
 *
 * Variants:
 *   - "pill"  → 44px circular icon for the global TopBar.
 *   - "chip"  → IdChip-style pill for the AccountTierCard (legacy footprint).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Briefcase, ChevronDown, Check, Sparkles,
  Truck, Store, Settings2, CreditCard, BriefcaseBusiness, User,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { IdentityGateway } from "@/core/identity";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSovereignOverride } from "@/hooks/useSovereignOverride";
import { useSovereignContext, type PersonaRow } from "@/core/capabilities/store/useSovereignContext";
import { cn } from "@/lib/utils";

// Lucide icon resolver — `salsabil_persona_matrix.icon` stores the icon name.
const ICONS: Record<string, LucideIcon> = {
  ShoppingBag, Briefcase, Truck, Store, Settings2, CreditCard,
  BriefcaseBusiness, User, Sparkles,
};
const resolveIcon = (name?: string | null): LucideIcon =>
  (name && ICONS[name]) || Sparkles;

// Business roles unlock the B2B persona.
const B2B_ROLES = new Set(["admin", "vendor", "delivery", "branch_manager", "store_manager", "finance", "cashier"]);

// Where each persona naturally lands.
const PERSONA_HOMES: Record<string, string> = {
  consumer: "/",
  business: "/vendor",
};

const personaHomeFor = (key: string, roles: string[]): string => {
  if (key === "business") {
    if (roles.includes("admin") || roles.includes("branch_manager") || roles.includes("finance")) return "/admin";
    if (roles.includes("delivery")) return "/driver";
    if (roles.includes("cashier")) return "/pos";
    return "/vendor";
  }
  return PERSONA_HOMES[key] ?? "/";
};

// Short-ID per Doctrine 9.2 — last 6 digits of the user identifier.
const shortIdFromUuid = (uuid?: string | null): string => {
  if (!uuid) return "000000";
  const digits = uuid.replace(/[^0-9a-f]/gi, "")
    .split("").map((c) => (parseInt(c, 16) % 10).toString()).join("");
  return digits.slice(-6).padStart(6, "0");
};

type Props = { variant?: "pill" | "chip"; className?: string };

const SovereignPersonaSwitcher = ({ variant = "pill", className }: Props) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { roles } = useUserRoles();
  const hasSovereignOverride = useSovereignOverride();
  const { activePersonaKey, setPersona } = useSovereignContext();
  const [open, setOpen] = useState(false);

  const { data: personas = [] } = useQuery({
    queryKey: ["salsabil_persona_matrix"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PersonaRow[]> => {
      const rows = await IdentityGateway.listActivePersonas();
      return rows as unknown as PersonaRow[];
    },
  });

  // Filter personas by role gating.
  const availablePersonas = useMemo(() => {
    return personas.filter((p) => {
      if (p.persona_key === "consumer") return true;
      if (p.persona_key === "business") return roles.some((r) => B2B_ROLES.has(r));
      return true;
    });
  }, [personas, roles]);

  const active = availablePersonas.find((p) => p.persona_key === activePersonaKey)
    ?? personas.find((p) => p.persona_key === activePersonaKey)
    ?? null;
  const ActiveIcon = resolveIcon(active?.icon);
  const switchable = availablePersonas.length > 1;

  // Phase 23 — Sovereign Stealth: a standard customer with a single
  // available persona must NEVER see the switcher affordance. The TopBar
  // stays clean; the AccountTierCard chip collapses to nothing (the ID
  // chip on that card is rendered separately by the card itself).
  if (!switchable) return null;

  const handleSelect = (p: PersonaRow) => {
    // Phase 19 — Sovereign Soft-Wall: switching to Business persona requires KYC.
    // Phase 55 — Sovereign Override: admins bypass KYC entirely.
    if (p.persona_key === "business" && !profile?.is_kyc_verified && !hasSovereignOverride) {
      setOpen(false);
      navigate({ to: "/wallet" }).catch(() => { /* triggers KycUpgradeGate */ });
      return;
    }
    setPersona(p.persona_key);
    setOpen(false);
    const target = personaHomeFor(p.persona_key, roles);
    // Navigate without a hard reload — theme morph is already running.
    navigate({ to: target }).catch(() => { /* route may not exist for some installs */ });
  };

  const trigger =
    variant === "chip" ? (
      <button
        type="button"
        disabled={!switchable}
        onClick={() => setOpen(true)}
        aria-label="تبديل الواجهة"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-foreground/15 px-2 py-1 ring-1 ring-foreground/20 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 transition active:scale-[0.97] disabled:opacity-90 disabled:cursor-default",
          className,
        )}
      >
        <span className="text-[8.5px] font-bold opacity-70 tracking-[0.18em]">ID</span>
        <span dir="ltr" className="font-mono text-[10.5px] font-semibold tabular-nums tracking-[0.22em] opacity-90">
          {shortIdFromUuid(user?.id)}
        </span>
        {switchable && <ChevronDown className="h-3 w-3 opacity-80" strokeWidth={2.6} />}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="تبديل الشخصية"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 backdrop-blur-md transition active:scale-[0.95]",
          className,
        )}
      >
        <ActiveIcon className="h-5 w-5" strokeWidth={2.2} />
        {switchable && (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </button>
    );

  return (
    <>
      {trigger}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-t-0 px-4 pb-6 pt-5 max-h-[80vh]"
          dir="rtl"
        >
          <SheetHeader className="text-right">
            <SheetTitle className="font-display text-lg font-extrabold">
              تبديل الشخصية
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              اختر الواجهة التي تناسب دورك الآن — يتم تبديل الهوية البصرية فورًا.
            </SheetDescription>
          </SheetHeader>

          <ul className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {availablePersonas.map((p, i) => {
                const Icon = resolveIcon(p.icon);
                const isActive = p.persona_key === activePersonaKey;
                const overlay = p.theme_overlay?.colors ?? {};
                const tintPrimary = overlay.primary ?? null;
                return (
                  <motion.li
                    key={p.persona_key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right transition active:scale-[0.99]",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-pill"
                          : "bg-card text-foreground ring-1 ring-border/60 hover:bg-foreground/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          isActive ? "bg-primary-foreground/15" : "bg-foreground/[0.06]",
                        )}
                        style={!isActive && tintPrimary ? { background: `hsl(${tintPrimary} / 0.12)`, color: `hsl(${tintPrimary})` } : undefined}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-display text-[14px] font-extrabold leading-tight truncate">
                          {p.label_ar}
                        </span>
                        <span className={cn(
                          "block text-[11px] mt-0.5 truncate",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}>
                          {p.capabilities?.slice(0, 2).join(" · ") || "—"}
                        </span>
                      </span>
                      {isActive && <Check className="h-4 w-4 shrink-0" strokeWidth={2.6} />}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>

            {availablePersonas.length === 0 && (
              <li className="rounded-2xl bg-foreground/[0.04] p-4 text-center text-xs text-muted-foreground">
                لا توجد شخصيات متاحة لحسابك بعد.
              </li>
            )}
          </ul>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Sovereign Persona Engine · Phase 18
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SovereignPersonaSwitcher;
