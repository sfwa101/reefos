/**
 * SectionHeroBanner — Phase 60.
 *
 * Renders a section's unique hero personality + optional quick action chips.
 * Driven entirely by SectionIdentity config — no per-slug branching.
 */
import { storeThemes } from "@/lib/storeThemes";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  SectionIdentity,
  SectionQuickAction,
} from "@/core/catalog/registry/SectionIdentityRegistry";

const resolveIcon = (name: string): LucideIcon => {
  const lib = LucideIcons as unknown as Record<string, LucideIcon>;
  return lib[name] ?? LucideIcons.Star;
};

export const SectionHeroBanner = ({ identity }: { identity: SectionIdentity }) => {
  const navigate = useNavigate();
  const theme = storeThemes[identity.themeKey];
  const gradient = identity.hero.gradient ?? theme.gradient;

  const handleAction = (action: SectionQuickAction) => {
    if (action.action === "toast") toast(action.payload);
    if (action.action === "navigate") navigate({ to: action.payload });
  };

  const actions = identity.quickActions ?? [];

  return (
    <div className="space-y-3 px-4">
      <section
        className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
        style={{ background: gradient }}
      >
        <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {identity.hero.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-white text-balance leading-tight">
            {identity.hero.headline}
          </h2>
          <p className="mt-1 text-xs text-white/85">{identity.hero.body}</p>
        </div>
      </section>

      {actions.length > 0 && (
        <div
          className={`grid gap-3 ${
            actions.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {actions.map((qa) => {
            const Icon = resolveIcon(qa.icon);
            return (
              <Button
                key={qa.label}
                onClick={() => handleAction(qa)}
                className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-3 shadow-soft text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2.4} />
                </div>
                <span className="text-[11px] font-bold leading-tight">{qa.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SectionHeroBanner;
