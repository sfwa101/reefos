/**
 * Khalil — Identity page (P2.5).
 *
 * Owner-only view of identity state, rolling windows, and recompute
 * action. Read-only otherwise — level transitions are server-attested.
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import {
  khalilKeys,
  kt,
  readIdentityFn,
  recomputeIdentityFn,
  type KhalilIdentityLevel,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilError, KhalilLoading } from "../primitives/StateViews";

type ReadResult = Awaited<ReturnType<typeof readIdentityFn>>;
type RecomputeResult = Awaited<ReturnType<typeof recomputeIdentityFn>>;

function levelLabel(l: KhalilIdentityLevel): string {
  return kt(`khalil.identity.level.${l}`);
}

function pct(n: number): string {
  return `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`;
}

export function KhalilIdentityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const read = useServerFn(readIdentityFn);
  const recompute = useServerFn(recomputeIdentityFn);

  const { data, isLoading, isError, refetch } = useQuery<ReadResult>({
    queryKey: khalilKeys.identity(user?.id ?? null),
    queryFn: () => read(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const mutation = useMutation<RecomputeResult, Error, void>({
    mutationFn: async () => recompute({ data: {} }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khalilKeys.identity(user?.id ?? null) });
      void qc.invalidateQueries({ queryKey: khalilKeys.home() });
    },
  });

  const onRecompute = useCallback(() => {
    if (mutation.isPending) return;
    mutation.mutate();
  }, [mutation]);

  if (isLoading) return <KhalilLoading />;
  if (isError || !data) return <KhalilError onRetry={() => void refetch()} />;

  const s = data.state;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 p-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">{kt("khalil.identity.title")}</h1>
        <p className="text-sm text-muted-foreground">{kt("khalil.identity.subtitle")}</p>
      </header>

      <article className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white p-6 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-background">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
          {kt("khalil.identity.chip.label")}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-foreground">{levelLabel(s.currentLevel)}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {kt("khalil.identity.chip.score")}:{" "}
          <span className="font-medium text-foreground">{pct(s.currentScore)}</span>
        </p>
        {s.nextThreshold ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {kt("khalil.identity.chip.next")}:{" "}
            <span className="font-medium text-foreground">
              {levelLabel(s.nextThreshold.level)} ({pct(s.nextThreshold.minScore)})
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{kt("khalil.identity.chip.top")}</p>
        )}

        <button
          type="button"
          onClick={onRecompute}
          disabled={mutation.isPending}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/70 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800/40 dark:bg-background/40 dark:text-amber-300"
        >
          <RefreshCw
            className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
            strokeWidth={2.2}
            aria-hidden
          />
          {mutation.isPending
            ? kt("khalil.identity.action.recomputing")
            : kt("khalil.identity.action.recompute")}
        </button>
      </article>

      <article className="rounded-3xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">{kt("khalil.identity.windows.title")}</h3>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          {(
            [
              ["khalil.identity.windows.w30", s.windows.window30d],
              ["khalil.identity.windows.w90", s.windows.window90d],
              ["khalil.identity.windows.w180", s.windows.window180d],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">{kt(k)}</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">{pct(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {kt("khalil.identity.observed_days")} {s.windows.observedDays}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {kt("khalil.identity.last_computed_at")}{" "}
          {new Date(s.lastComputedAt).toLocaleString()}
        </p>
      </article>

      <p className="text-center text-xs text-muted-foreground">{kt("khalil.identity.note")}</p>
    </section>
  );
}
