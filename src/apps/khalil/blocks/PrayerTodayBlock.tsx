/**
 * Khalil — `khalil.prayer.today` block (P2.2).
 *
 * Composition-driven prayer pillar surface. Loads through the gateway
 * only (no Supabase imports), owns its own loading/error/empty states,
 * supports optimistic logging, and reflects offline pending state.
 *
 * Zero hardcoded literals — all strings via `kt(...)`.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, MoonStar, WifiOff } from "lucide-react";
import {
  khalilKeys,
  khalilOfflineQueue,
  KHALIL_CAP,
  kt,
} from "@/core/khalil";
import {
  logPrayerFn,
  readPrayerTodayFn,
  PRAYER_NAMES,
  computePrayerDayView,
  type PrayerLogRow,
  type PrayerName,
} from "@/core/khalil/prayer";
import { useAuth } from "@/context/AuthContext";
import { KhalilError, KhalilLoading } from "../primitives/StateViews";

type LogPrayerResult = Awaited<ReturnType<typeof logPrayerFn>>;
type ReadResult = { date: string; rows: PrayerLogRow[] };

function todayLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function useOfflineQueueSize(): number {
  return useSyncExternalStore(
    (cb) => khalilOfflineQueue.subscribe(() => cb()),
    () => khalilOfflineQueue.size(),
    () => 0,
  );
}

export function PrayerTodayBlock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const date = todayLocalDate();

  const readToday = useServerFn(readPrayerTodayFn);
  const logPrayer = useServerFn(logPrayerFn);
  const queueSize = useOfflineQueueSize();

  const queryKey = khalilKeys.prayer(user?.id ?? null, date);

  const { data, isLoading, isError, refetch } = useQuery<ReadResult>({
    queryKey,
    queryFn: () => readToday({ data: { date } }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const view = useMemo(
    () => computePrayerDayView(date, data?.rows ?? []),
    [date, data?.rows],
  );

  const mutation = useMutation({
    mutationFn: async (prayer: PrayerName) => {
      const now = new Date();
      const clientEventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${user?.id ?? "anon"}-${date}-${prayer}-${now.getTime()}`;

      const payload = {
        prayer,
        mode: "on_time" as const,
        loggedForDate: date,
        occurredAtClientMs: now.getTime(),
        occurredAtClientHour: now.getHours(),
        clientEventId,
      };

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        khalilOfflineQueue.enqueue({
          capability: KHALIL_CAP.PRAYER_LOG_WRITE,
          payload,
          idempotencyKey: clientEventId,
        });
        return { status: "queued" as const, clientEventId };
      }

      const res: LogPrayerResult = await logPrayer({ data: payload });
      return { ...res, clientEventId };
    },
    onMutate: async (prayer: PrayerName) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ReadResult>(queryKey);
      const optimistic: PrayerLogRow = {
        id: `optimistic:${prayer}:${Date.now()}`,
        prayer,
        mode: "on_time",
        loggedForDate: date,
        occurredAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ReadResult>(queryKey, {
        date,
        rows: [...(prev?.rows ?? []), optimistic],
      });
      return { prev };
    },
    onError: (_err, _prayer, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleLog = useCallback(
    (prayer: PrayerName) => {
      if (!user) return;
      if (mutation.isPending) return;
      mutation.mutate(prayer);
    },
    [mutation, user],
  );

  return (
    <section
      aria-label={kt("khalil.prayer.block.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoonStar className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
              {kt("khalil.prayer.block.title")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {kt("khalil.prayer.block.subtitle")}
            </p>
          </div>
        </div>
        {queueSize > 0 && (
          <span
            role="status"
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
          >
            <WifiOff className="h-3 w-3" aria-hidden />
            {kt("khalil.prayer.offline.pending")}
          </span>
        )}
      </header>

      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}

      {!isLoading && !isError && (
        <ul className="grid grid-cols-5 gap-2">
          {PRAYER_NAMES.map((p) => {
            const logged = view.byPrayer[p];
            const isDone = Boolean(logged);
            const isOptimistic = logged?.id.startsWith("optimistic:");
            return (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => handleLog(p)}
                  disabled={isDone || mutation.isPending}
                  aria-pressed={isDone}
                  aria-label={kt(`khalil.prayer.name.${p}`)}
                  className={[
                    "flex w-full flex-col items-center gap-1 rounded-2xl p-2 text-center transition",
                    isDone
                      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                      : "bg-secondary/60 text-foreground hover:bg-secondary",
                    isOptimistic ? "animate-pulse" : "",
                  ].join(" ")}
                >
                  <span className="text-[11px] font-semibold">
                    {kt(`khalil.prayer.name.${p}`)}
                  </span>
                  <span aria-hidden>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4 opacity-60" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
