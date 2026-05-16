/**
 * Khalil — `khalil.habit.today` block (P2.3).
 *
 * Composition-driven habit pillar surface. Gateway-only I/O. Owns
 * loading/empty/error states. Optimistic complete + offline queue
 * pending indicator. Zero hardcoded literals — all strings via `kt()`.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, Sprout, WifiOff } from "lucide-react";
import {
  khalilKeys,
  khalilOfflineQueue,
  KHALIL_CAP,
  kt,
} from "@/core/khalil";
import {
  completeHabitFn,
  readHabitsTodayFn,
  computeHabitDayView,
  type HabitCompletionRow,
  type HabitDefinitionRow,
} from "@/core/khalil/habit";
import { useAuth } from "@/context/AuthContext";
import { KhalilEmpty, KhalilError, KhalilLoading } from "../primitives/StateViews";

type ReadResult = {
  date: string;
  definitions: HabitDefinitionRow[];
  completions: HabitCompletionRow[];
};

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

export function HabitTodayBlock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const date = todayLocalDate();
  const readHabits = useServerFn(readHabitsTodayFn);
  const completeHabit = useServerFn(completeHabitFn);
  const queueSize = useOfflineQueueSize();

  const queryKey = khalilKeys.habits(user?.id ?? null, date);

  const { data, isLoading, isError, refetch } = useQuery<ReadResult>({
    queryKey,
    queryFn: () => readHabits({ data: { date } }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const view = useMemo(
    () =>
      computeHabitDayView(
        date,
        data?.definitions ?? [],
        data?.completions ?? [],
      ),
    [date, data?.definitions, data?.completions],
  );

  const mutation = useMutation({
    mutationFn: async (habitId: string) => {
      const now = new Date();
      const clientEventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${user?.id ?? "anon"}-${date}-${habitId}-${now.getTime()}`;
      const payload = {
        habitId,
        date,
        partial: 1 as const,
        mode: "normal" as const,
        occurredAtClientHour: now.getHours(),
        todayLocalDate: date,
        recoveryMode: "off" as const,
        clientEventId,
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        khalilOfflineQueue.enqueue({
          capability: KHALIL_CAP.HABIT_COMPLETE_WRITE,
          payload,
          idempotencyKey: clientEventId,
        });
        return { status: "queued" as const };
      }
      return await completeHabit({ data: payload });
    },
    onMutate: async (habitId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<ReadResult>(queryKey);
      const optimistic: HabitCompletionRow = {
        id: `optimistic:${habitId}:${Date.now()}`,
        habitId,
        date,
        partial: 1,
        mode: "normal",
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ReadResult>(queryKey, {
        date,
        definitions: prev?.definitions ?? [],
        completions: [...(prev?.completions ?? []), optimistic],
      });
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleComplete = useCallback(
    (habitId: string) => {
      if (!user || mutation.isPending) return;
      mutation.mutate(habitId);
    },
    [mutation, user],
  );

  return (
    <section
      aria-label={kt("khalil.habit.block.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sprout className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
              {kt("khalil.habit.block.title")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {kt("khalil.habit.block.subtitle")}
            </p>
          </div>
        </div>
        {queueSize > 0 && (
          <span
            role="status"
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
          >
            <WifiOff className="h-3 w-3" aria-hidden />
            {kt("khalil.habit.offline.pending")}
          </span>
        )}
      </header>

      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {!isLoading && !isError && view.definitions.length === 0 && (
        <KhalilEmpty
          title={kt("khalil.habit.empty.title")}
          body={kt("khalil.habit.empty.body")}
        />
      )}

      {!isLoading && !isError && view.definitions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {view.definitions.map((d) => {
            const done = view.byHabit[d.id];
            const isDone = Boolean(done);
            const isOptimistic = done?.id.startsWith("optimistic:");
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => handleComplete(d.id)}
                  disabled={isDone || mutation.isPending}
                  aria-pressed={isDone}
                  aria-label={kt(d.nameKey) || d.slug}
                  className={[
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-start transition",
                    isDone
                      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                      : "bg-secondary/60 text-foreground hover:bg-secondary",
                    isOptimistic ? "animate-pulse" : "",
                  ].join(" ")}
                >
                  <span className="text-sm font-semibold">
                    {kt(d.nameKey) || d.slug}
                  </span>
                  <span aria-hidden>
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5 opacity-60" />
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
