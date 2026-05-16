/**
 * Khalil — analytics blocks (P2.7).
 *
 * Lightweight, NO chart libraries. Charts live exclusively on the
 * insights route (lazy-loaded). Home blocks render minimal heatmap
 * cells + score bars in plain CSS.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CalendarDays } from "lucide-react";
import {
  khalilKeys,
  kt,
  readAdherenceFn,
  readHeatmapFn,
  type AdherenceReadDTO,
  type HeatmapReadDTO,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilLoading, KhalilError, KhalilEmpty } from "../primitives/StateViews";

const BUCKET_BG = [
  "bg-secondary/30",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/60",
  "bg-primary",
] as const;

export function AnalyticsHeatmapBlock() {
  const { user } = useAuth();
  const readHeatmap = useServerFn(readHeatmapFn);
  const queryKey = khalilKeys.analytics(user?.id ?? null, "30d");

  const { data, isLoading, isError, refetch } = useQuery<HeatmapReadDTO>({
    queryKey: [...queryKey, "heatmap"],
    queryFn: () => readHeatmap({ data: { window: "30d" } }),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  return (
    <section
      aria-label={kt("khalil.analytics.heatmap.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
            {kt("khalil.analytics.heatmap.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {kt("khalil.analytics.heatmap.subtitle")}
          </p>
        </div>
      </header>
      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {!isLoading && !isError && (data?.cells.length ?? 0) === 0 && (
        <KhalilEmpty body={kt("khalil.analytics.empty")} />
      )}
      {!isLoading && !isError && (data?.cells.length ?? 0) > 0 && (
        <div className="grid grid-cols-10 gap-1" role="grid">
          {data!.cells.map((c) => (
            <span
              key={c.forDate}
              role="gridcell"
              title={`${c.forDate}: ${Math.round(c.combinedScore * 100)}%`}
              className={`aspect-square rounded ${BUCKET_BG[c.bucket]}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function AnalyticsAdherenceBlock() {
  const { user } = useAuth();
  const readAdherence = useServerFn(readAdherenceFn);
  const queryKey = khalilKeys.analytics(user?.id ?? null, "7d");

  const { data, isLoading, isError, refetch } = useQuery<AdherenceReadDTO>({
    queryKey: [...queryKey, "adherence"],
    queryFn: () => readAdherence({ data: { window: "7d" } }),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const avg = (sel: (d: AdherenceReadDTO["days"][number]) => number) => {
    if (!data || data.days.length === 0) return 0;
    const total = data.days.reduce((a, d) => a + sel(d), 0);
    return total / data.days.length;
  };

  return (
    <section
      aria-label={kt("khalil.analytics.adherence.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
            {kt("khalil.analytics.adherence.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {kt("khalil.analytics.adherence.subtitle")}
          </p>
        </div>
      </header>
      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {!isLoading && !isError && (data?.days.length ?? 0) === 0 && (
        <KhalilEmpty body={kt("khalil.analytics.empty")} />
      )}
      {!isLoading && !isError && (data?.days.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          {([
            ["khalil.nav.prayer", avg((d) => d.prayerScore)],
            ["khalil.nav.habits", avg((d) => d.habitScore)],
            ["khalil.identity.chip.score", avg((d) => d.combinedScore)],
          ] as const).map(([k, v]) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{kt(k)}</span>
                <span>{Math.round(v * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/40">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, v * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
