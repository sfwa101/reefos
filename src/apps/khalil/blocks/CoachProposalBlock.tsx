/**
 * Khalil — Coach proposal block (P2.6 §9).
 *
 * Renders the latest pending proposal with accept / dismiss actions.
 * No conversational UI, no typing input, no free-form prompting. All
 * copy resolved through `kt()`. State changes route through gateways
 * only — UI never mutates Supabase directly.
 */
import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WifiOff } from "lucide-react";
import {
  khalilKeys,
  khalilOfflineQueue,
  KHALIL_CAP,
  kt,
} from "@/core/khalil";
import {
  readCoachHistoryFn,
  acceptCoachFn,
  dismissCoachFn,
} from "@/core/khalil/coach";
import { useAuth } from "@/context/AuthContext";

const subscribeQueue = (cb: () => void) =>
  khalilOfflineQueue.subscribe(() => cb());
const getQueueSize = () => khalilOfflineQueue.size();
const getQueueSizeSSR = () => 0;

export function CoachProposalBlock() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readHistory = useServerFn(readCoachHistoryFn);
  const accept = useServerFn(acceptCoachFn);
  const dismiss = useServerFn(dismissCoachFn);

  const queueSize = useSyncExternalStore(
    subscribeQueue,
    getQueueSize,
    getQueueSizeSSR,
  );

  const { data } = useQuery({
    queryKey: khalilKeys.coach(user?.id ?? null),
    queryFn: () => readHistory(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const proposal = data?.pending ?? null;

  const onAct = useCallback(
    async (action: "accept" | "dismiss") => {
      if (!proposal) return;
      const clientEventId = crypto.randomUUID();
      khalilOfflineQueue.enqueue({
        capability:
          action === "accept" ? KHALIL_CAP.COACH_ACCEPT : KHALIL_CAP.COACH_DISMISS,
        idempotencyKey: clientEventId,
        payload: { proposalId: proposal.id, clientEventId },
      });
      try {
        if (action === "accept") {
          await accept({ data: { proposalId: proposal.id, clientEventId } });
        } else {
          await dismiss({ data: { proposalId: proposal.id, clientEventId } });
        }
        const entry = khalilOfflineQueue
          .peek()
          .find((i) => i.idempotencyKey === clientEventId);
        if (entry) khalilOfflineQueue.drop(entry.id);
        void qc.invalidateQueries({
          queryKey: khalilKeys.coach(user?.id ?? null),
        });
        void qc.invalidateQueries({ queryKey: khalilKeys.home() });
      } catch {
        /* leave in queue for retry */
      }
    },
    [proposal, accept, dismiss, qc, user?.id],
  );

  const acceptMutation = useMutation({ mutationFn: () => onAct("accept") });
  const dismissMutation = useMutation({ mutationFn: () => onAct("dismiss") });

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-base font-bold tracking-tight">
            {kt("khalil.coach.block.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {kt("khalil.coach.block.subtitle")}
          </p>
        </div>
        {queueSize > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <WifiOff className="h-3 w-3" aria-hidden />
            {kt("khalil.coach.offline.pending")}
          </span>
        )}
      </header>

      {!proposal ? (
        <p className="mt-4 rounded-xl bg-muted/40 px-3 py-3 text-xs leading-6 text-muted-foreground">
          {kt("khalil.coach.state.empty")}
        </p>
      ) : (
        <div className="mt-4">
          <p className="font-display text-sm font-semibold leading-6">
            {kt(proposal.copyKey)}
          </p>
          {proposal.payload.bodyKey && (
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {kt(proposal.payload.bodyKey)}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acceptMutation.isPending || dismissMutation.isPending}
              onClick={() => acceptMutation.mutate()}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {kt("khalil.coach.action.accept")}
            </button>
            <button
              type="button"
              disabled={acceptMutation.isPending || dismissMutation.isPending}
              onClick={() => dismissMutation.mutate()}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              {kt("khalil.coach.action.dismiss")}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-[10px] leading-5 text-muted-foreground">
        {kt("khalil.coach.note")}
      </p>
    </section>
  );
}
