/**
 * SduiAppGridBlock — Phase VIII Khalil Mini-App launcher tile grid.
 * Resolves cards from the central appRegistry; SDUI JSON only specifies
 * which app IDs (or `*` for "all") and the grid title.
 */
import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { appRegistry } from "@/core/capabilities/app-registry";
import type { SduiAppGridBlock as Props } from "../engine/schemas";
import { useAuth } from "@/context/AuthContext";

function Impl({ block }: { block: Props }) {
  const { user } = useAuth();
  const all = appRegistry.list({ userId: user?.id ?? null });
  const ids = block.props.appIds;
  const apps =
    ids.length === 1 && ids[0] === "*"
      ? all
      : ids
          .map((id: string) => all.find((a) => a.id === id))
          .filter((a): a is (typeof all)[number] => Boolean(a));

  if (apps.length === 0) return null;

  return (
    <section dir="rtl" className="space-y-3">
      {block.props.title && (
        <h2 className="text-base font-extrabold text-foreground">{block.props.title}</h2>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <Link
              key={app.id}
              to={app.route}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-sm transition active:scale-[0.98]"
            >
              <div
                className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${app.accent} opacity-90`}
              />
              <div className="relative flex h-24 items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 shadow ring-1 ring-black/5">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                {app.status !== "live" && (
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-foreground">
                    {app.status === "beta" ? "تجريبي" : "قريباً"}
                  </span>
                )}
              </div>
              <div className="relative mt-2">
                <div className="text-sm font-extrabold text-foreground">{app.name}</div>
                {app.tagline && (
                  <div className="text-[11px] text-muted-foreground">{app.tagline}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export const SduiAppGridBlock = memo(Impl);
