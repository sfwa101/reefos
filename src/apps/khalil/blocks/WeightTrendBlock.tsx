/**
 * Khalil — `khalil.weight.trend` block (P2.7).
 * Projection-driven. Gateway-only I/O.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Scale, TrendingDown, TrendingUp, Minus, WifiOff } from "lucide-react";
import {
  KHALIL_CAP,
  khalilKeys,
  khalilOfflineQueue,
  kt,
  readWeightTrendFn,
  writeWeightMeasurementFn,
  type WeightTrendDTO,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilLoading, KhalilError } from "../primitives/StateViews";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function useQueueSize(): number {
  return useSyncExternalStore(
    (cb) => khalilOfflineQueue.subscribe(() => cb()),
    () => khalilOfflineQueue.size(),
    () => 0,
  );
}

export function WeightTrendBlock() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readTrend = useServerFn(readWeightTrendFn);
  const writeMeasurement = useServerFn(writeWeightMeasurementFn);
  const queryKey = khalilKeys.weight(user?.id ?? null, "30d");
  const queueSize = useQueueSize();
  const [value, setValue] = useState("");

  const { data, isLoading, isError, refetch } = useQuery<WeightTrendDTO>({
    queryKey,
    queryFn: () => readTrend(),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const mut = useMutation({
    mutationFn: async (kg: number) => {
      const cid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${user?.id ?? "anon"}-${Date.now()}`;
      const payload = {
        forDate: todayIso(),
        weightKg: kg,
        source: "manual" as const,
        clientEventId: cid,
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        khalilOfflineQueue.enqueue({
          capability: KHALIL_CAP.WEIGHT_MEASUREMENT_WRITE,
          payload,
          idempotencyKey: cid,
        });
        return { status: "queued" as const };
      }
      return await writeMeasurement({ data: payload });
    },
    onSettled: () => {
      setValue("");
      void qc.invalidateQueries({ queryKey });
    },
  });

  const onSubmit = useCallback(() => {
    const kg = Number.parseFloat(value);
    if (!Number.isFinite(kg)) return;
    mut.mutate(kg);
  }, [value, mut]);

  const Icon =
    data?.trendDirection === "down" ? TrendingDown :
    data?.trendDirection === "up" ? TrendingUp : Minus;

  return (
    <section
      aria-label={kt("khalil.weight.block.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Scale className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
              {kt("khalil.weight.block.title")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {kt("khalil.weight.block.subtitle")}
            </p>
          </div>
        </div>
        {queueSize > 0 && (
          <span
            role="status"
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
          >
            <WifiOff className="h-3 w-3" aria-hidden />
            {kt("khalil.weight.offline.pending")}
          </span>
        )}
      </header>

      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-3">
          {data.measurementsCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {kt("khalil.weight.state.no_data")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="text-muted-foreground">
                  {kt("khalil.weight.state.latest")}
                </div>
                <div className="font-display text-lg font-extrabold text-foreground">
                  {data.latestKg} {kt("khalil.weight.unit.kg")}
                </div>
              </div>
              <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Icon className="h-3 w-3" aria-hidden />
                  {kt(`khalil.weight.trend.${data.trendDirection}`)}
                </div>
                <div className="font-display text-lg font-extrabold text-foreground">
                  {(data.delta7d ?? 0).toFixed(2)} {kt("khalil.weight.unit.kg")}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={kt("khalil.weight.placeholder")}
              className="h-10 flex-1 rounded-full bg-secondary/40 px-4 text-sm text-foreground outline-none"
              aria-label={kt("khalil.weight.placeholder")}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={mut.isPending || value.length === 0}
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {kt("khalil.weight.action.record")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
