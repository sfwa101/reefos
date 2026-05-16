/**
 * Khalil — `khalil.identity.chip` block (P2.5).
 *
 * Read-only surface bound to the server-projected identity state.
 * Renders current level + next-threshold hint + an explicit recompute
 * affordance. Owner-only by capability. All copy via `kt()`.
 *
 * The chip never computes the level client-side — it reflects whatever
 * `readIdentityFn` returns. The recompute action audits server-side.
 */
import { useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  khalilKeys,
  kt,
  readIdentityFn,
  recomputeIdentityFn,
  type KhalilIdentityLevel,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";

type ReadResult = Awaited<ReturnType<typeof readIdentityFn>>;
type RecomputeResult = Awaited<ReturnType<typeof recomputeIdentityFn>>;

function levelLabel(l: KhalilIdentityLevel): string {
  return kt(`khalil.identity.level.${l}`);
}

function pct(n: number): string {
  return `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`;
}

export function IdentityChipBlock() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const read = useServerFn(readIdentityFn);
  const recompute = useServerFn(recomputeIdentityFn);

  const { data, isLoading } = useQuery<ReadResult>({
    queryKey: khalilKeys.identity(user?.id ?? null),
    queryFn: () => read(),
    enabled: Boolean(user),
    staleTime: 60_000,
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

  const level = data?.state.currentLevel ?? "seed";
  const score = data?.state.currentScore ?? 0;
  const next = data?.state.nextThreshold ?? null;

  return (
    <section
      aria-label={kt("khalil.identity.chip.label")}
      className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white p-5 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-background"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300"
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
            {kt("khalil.identity.chip.label")}
          </p>
          <Link
            to="/khalil/identity"
            className="mt-1 block truncate text-lg font-semibold text-foreground hover:underline"
          >
            {isLoading ? kt("khalil.state.loading") : levelLabel(level)}
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {kt("khalil.identity.chip.score")}: {pct(score)}
            </span>
            {next ? (
              <>
                <span aria-hidden> · </span>
                <span>
                  {kt("khalil.identity.chip.next")}:{" "}
                  {levelLabel(next.level)} ({pct(next.minScore)})
                </span>
              </>
            ) : (
              <>
                <span aria-hidden> · </span>
                <span>{kt("khalil.identity.chip.top")}</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRecompute}
          disabled={mutation.isPending || !user}
          aria-label={kt("khalil.identity.action.recompute")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-white/70 text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800/40 dark:bg-background/40 dark:text-amber-300"
        >
          <RefreshCw
            className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
            strokeWidth={2.2}
            aria-hidden
          />
        </button>
      </div>
    </section>
  );
}
