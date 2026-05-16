/**
 * Khalil — mobile-first bottom nav.
 *
 * 5 pillars (home, prayer, habits, workout, weight). Insights + coach live
 * inside home until they earn nav real-estate. Mobile reference 390px
 * (p1-mobile-first.md); collapses to a top tab-bar on ≥md.
 */
import { Link, useLocation } from "@tanstack/react-router";
import { Home, MoonStar, ListChecks, Dumbbell, Scale } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { kt } from "@/core/khalil";

type Item = {
  to: string;
  labelKey: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const ITEMS: ReadonlyArray<Item> = [
  { to: "/khalil", labelKey: "khalil.nav.home", Icon: Home },
  { to: "/khalil/prayer", labelKey: "khalil.nav.prayer", Icon: MoonStar },
  { to: "/khalil/habits", labelKey: "khalil.nav.habits", Icon: ListChecks },
  { to: "/khalil/workout", labelKey: "khalil.nav.workout", Icon: Dumbbell },
  { to: "/khalil/weight", labelKey: "khalil.nav.weight", Icon: Scale },
];

export function KhalilBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Khalil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {ITEMS.map(({ to, labelKey, Icon }) => {
          const active =
            to === "/khalil" ? pathname === "/khalil" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={[
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                <span>{kt(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
