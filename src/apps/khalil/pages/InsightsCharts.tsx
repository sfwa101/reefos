/**
 * Khalil — Insights charts (lazy-loaded, P2.7).
 *
 * Kept in its own module so the home route bundle never pulls chart
 * code. Today the chart layer is a plain CSS bar grid (no libraries) to
 * avoid mobile bundle bloat; replacing it with a real chart lib later
 * stays scoped to this file.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  khalilKeys,
  kt,
  readWorkoutVolumeFn,
  type WorkoutVolumeReadDTO,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilEmpty, KhalilError, KhalilLoading } from "../primitives/StateViews";

export default function WorkoutVolumeChart() {
  const { user } = useAuth();
  const readVolume = useServerFn(readWorkoutVolumeFn);
  const { data, isLoading, isError, refetch } = useQuery<WorkoutVolumeReadDTO>({
    queryKey: [...khalilKeys.analytics(user?.id ?? null, "90d"), "workout-volume"],
    queryFn: () => readVolume(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  if (isLoading) return <KhalilLoading />;
  if (isError) return <KhalilError onRetry={() => void refetch()} />;
  if (!data || data.weeks.length === 0) {
    return <KhalilEmpty body={kt("khalil.analytics.empty")} />;
  }
  const max = Math.max(1, ...data.weeks.map((w) => w.totalVolumeKg));
  return (
    <section
      aria-label={kt("khalil.nav.workout")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <h2 className="mb-3 font-display text-base font-extrabold tracking-tight text-foreground">
        {kt("khalil.nav.workout")}
      </h2>
      <div className="flex h-32 items-end gap-1" role="img">
        {data.weeks.map((w) => (
          <div
            key={`${w.isoYear}-${w.isoWeek}`}
            title={`${w.isoYear}-W${w.isoWeek}: ${Math.round(w.totalVolumeKg)} kg`}
            className="flex-1 rounded-t bg-primary/70"
            style={{ height: `${(w.totalVolumeKg / max) * 100}%` }}
          />
        ))}
      </div>
    </section>
  );
}
