/**
 * Khalil — `khalil.workout.next` block (P2.7).
 * Mobile-first. Gateway-only I/O. Owns its own loading/empty/error.
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dumbbell } from "lucide-react";
import {
  khalilKeys,
  kt,
  readWorkoutCurrentFn,
  startWorkoutSessionFn,
  closeWorkoutSessionFn,
  type WorkoutCurrentDTO,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilLoading, KhalilError } from "../primitives/StateViews";

export function WorkoutNextBlock() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readCurrent = useServerFn(readWorkoutCurrentFn);
  const startSession = useServerFn(startWorkoutSessionFn);
  const closeSession = useServerFn(closeWorkoutSessionFn);
  const queryKey = khalilKeys.workout(user?.id ?? null);

  const { data, isLoading, isError, refetch } = useQuery<WorkoutCurrentDTO>({
    queryKey,
    queryFn: () => readCurrent(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const startMut = useMutation({
    mutationFn: async () => {
      const cid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${user?.id ?? "anon"}-${Date.now()}`;
      return await startSession({ data: { clientEventId: cid } });
    },
    onSettled: () => void qc.invalidateQueries({ queryKey }),
  });

  const closeMut = useMutation({
    mutationFn: async (sessionId: string) =>
      await closeSession({ data: { sessionId } }),
    onSettled: () => void qc.invalidateQueries({ queryKey }),
  });

  const onStart = useCallback(() => {
    if (!user || startMut.isPending) return;
    startMut.mutate();
  }, [user, startMut]);

  return (
    <section
      aria-label={kt("khalil.workout.block.title")}
      className="rounded-3xl bg-card p-5 ring-1 ring-border/60 shadow-sm"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Dumbbell className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-base font-extrabold tracking-tight text-foreground">
            {kt("khalil.workout.block.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {kt("khalil.workout.block.subtitle")}
          </p>
        </div>
      </header>

      {isLoading && <KhalilLoading />}
      {isError && <KhalilError onRetry={() => void refetch()} />}
      {!isLoading && !isError && (
        <>
          {data?.session ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  {kt("khalil.workout.state.live")}
                </span>
                <span className="text-muted-foreground">
                  {kt("khalil.workout.state.volume")}:{" "}
                  {Math.round(data.totalVolumeKg)} {kt("khalil.weight.unit.kg")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => closeMut.mutate(data.session!.id)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-secondary px-4 text-xs font-bold text-secondary-foreground"
              >
                {kt("khalil.workout.action.close")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {kt("khalil.workout.state.no_session")}
              </p>
              <button
                type="button"
                onClick={onStart}
                disabled={startMut.isPending}
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {kt("khalil.workout.action.start")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
