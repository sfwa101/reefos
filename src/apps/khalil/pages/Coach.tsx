/**
 * Khalil — Coach page (P2.6 §10).
 *
 * Proposal/dispose surface only. No chat, no typing, no free-form
 * prompting. Refresh button asks the server for a new proposal; the
 * gateway returns either the still-valid pending one or generates a
 * fresh one (server-owned).
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { khalilKeys, kt, type CoachProposalDTO } from "@/core/khalil";
import {
  proposeCoachFn,
  readCoachHistoryFn,
} from "@/core/khalil/coach";
import { useAuth } from "@/context/AuthContext";
import { KhalilError, KhalilLoading } from "../primitives/StateViews";
import { CoachProposalBlock } from "../blocks/CoachProposalBlock";

function statusLabel(p: CoachProposalDTO): string {
  if (p.status === "accepted") return kt("khalil.coach.state.accepted");
  if (p.status === "dismissed") return kt("khalil.coach.state.dismissed");
  if (p.status === "expired") return kt("khalil.coach.state.expired");
  return "";
}

export function KhalilCoachPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readHistory = useServerFn(readCoachHistoryFn);
  const propose = useServerFn(proposeCoachFn);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: khalilKeys.coach(user?.id ?? null),
    queryFn: () => readHistory(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const refresh = useMutation({
    mutationFn: () => propose(),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: khalilKeys.coach(user?.id ?? null),
      });
      void qc.invalidateQueries({ queryKey: khalilKeys.home() });
    },
  });

  const onRefresh = useCallback(() => refresh.mutate(), [refresh]);

  if (isLoading) return <KhalilLoading />;
  if (isError) return <KhalilError onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <header className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {kt("khalil.brand.name")}
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.coach.title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {kt("khalil.coach.subtitle")}
        </p>
      </header>

      <CoachProposalBlock />

      <div className="px-1">
        <button
          type="button"
          disabled={refresh.isPending}
          onClick={onRefresh}
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          {kt("khalil.coach.action.refresh")}
        </button>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-bold tracking-tight">
          {kt("khalil.coach.history.title")}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {(data?.history ?? []).length === 0 && (
            <li className="text-xs leading-5 text-muted-foreground">
              {kt("khalil.coach.history.empty")}
            </li>
          )}
          {(data?.history ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {kt(`khalil.coach.kind.${p.kind}`)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {kt(p.copyKey)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {statusLabel(p)}
                </span>
                <time className="text-[10px] text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                </time>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
