import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useCartTotal } from "@/core/orders/runtime/react/CartProvider";
import { useLocationStatic as useDeliveryLocation } from "@/context/LocationContext";
import { useAuth } from "@/context/AuthContext";
import { LogisticsGateway } from "@/core/logistics";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { AppSwitcherSheet } from "@/components/AppSwitcherSheet";
import { OS_COMPANIES, type OSCompanyId } from "@/core/identity/osCompanies";
import { readDefaultLauncher } from "@/lib/defaultLauncher";

/**
 * TopBar — Phase 27 (Sovereign Launcher Notch).
 *
 * The central pill (formerly the address chip) is now the App Switcher
 * trigger — Apple-style notch that opens the sovereign launcher sheet.
 * Default-address resolution still happens silently on mount so the
 * delivery zone is hydrated for downstream cart / catalog logic.
 */

const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fmtCompact = (n: number) => toLatin(compactFmt.format(Math.round(n)));

const TopBar = () => {
  const total = useCartTotal();
  const { setFromAddress } = useDeliveryLocation();
  const { user } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [defaultTick, setDefaultTick] = useState(0);

  const expanded = total > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const list = await LogisticsGateway.listAddresses(user.id);
      if (cancelled) return;
      const def = list.find((a) => a.is_default) ?? list[0];
      if (def) setFromAddress(def.city, def.district);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Re-read the pinned default whenever the sheet closes (it may have changed).
  useEffect(() => {
    if (!switcherOpen) setDefaultTick((n) => n + 1);
  }, [switcherOpen]);

  const notch = useMemo(() => {
    const pinned = readDefaultLauncher();
    let companyId: OSCompanyId = "reef";
    if (pinned?.kind === "app") companyId = pinned.id as OSCompanyId;
    const company = OS_COMPANIES.find((c) => c.id === companyId) ?? OS_COMPANIES[1];
    return {
      label: pinned?.name ?? company.name,
      icon: company.icon,
      accent: company.accent,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTick]);

  const NotchIcon = notch.icon;

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 bg-background/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div dir="ltr" className="mx-auto grid h-14 w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-2 px-4 lg:max-w-[1400px] lg:px-6">
          {/* LEFT — Cart */}
          <Link
            to="/cart"
            aria-label="السلة"
            className="relative inline-flex h-11 min-w-11 items-center justify-start overflow-hidden rounded-full bg-primary/10 text-primary backdrop-blur-md ring-1 ring-primary/15 transition active:scale-[0.97]"
            dir="ltr"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
              <ShoppingBag className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  key="amount"
                  initial={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                  animate={{ width: "auto", opacity: 1, marginRight: 2, paddingRight: 14 }}
                  exit={{ width: 0, opacity: 0, marginRight: 0, paddingRight: 0 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden whitespace-nowrap font-display text-[15px] font-extrabold tabular-nums tracking-tight"
                >
                  {fmtCompact(total)}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* CENTER — Sovereign App Switcher Notch */}
          <Button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            aria-label="مبدّل التطبيقات"
            aria-haspopup="dialog"
            aria-expanded={switcherOpen}
            className="mx-auto inline-flex h-11 min-h-[44px] max-w-full items-center gap-2 truncate rounded-full bg-secondary/60 px-2.5 pe-3.5 text-[13px] font-bold text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-soft ${notch.accent}`}
            >
              <NotchIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="truncate font-extrabold">{notch.label}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${switcherOpen ? "rotate-180" : ""}`}
              strokeWidth={2.4}
            />
          </Button>

          {/* RIGHT — Hamburger → /account */}
          <Link
            to="/account"
            aria-label="القائمة"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary/60 text-foreground ring-1 ring-border/40 transition active:scale-[0.97]"
          >
            <Menu className="h-5 w-5" strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      <AppSwitcherSheet open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
};

export default TopBar;
