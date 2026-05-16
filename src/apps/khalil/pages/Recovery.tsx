/**
 * Khalil — Recovery page (P2.4).
 *
 * Audit-sensitive surface. Lets the user transition between recovery
 * states with the calm tone defined in p1-mvp-blueprint.md. All copy
 * via `kt()`. No client-side state decisions — the gateway is the law.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WifiOff } from "lucide-react";
import {
  khalilKeys,
  khalilOfflineQueue,
  KHALIL_CAP,
  kt,
  validateRecoveryTransition,
  type RecoveryMode,
} from "@/core/khalil";
import {
  readRecoveryStateFn,
  toggleRecoveryFn,
} from "@/core/khalil/recovery";
import { useAuth } from "@/context/AuthContext";
import { KhalilError, KhalilLoading } from "../primitives/StateViews";

type ReadResult = Awaited<ReturnType<typeof readRecoveryStateFn>>;
type ToggleResult = Awaited<ReturnType<typeof toggleRecoveryFn>>;

const subscribeQueue = (cb: () => void) =>
  khalilOfflineQueue.subscribe(() => cb());
const getQueueSize = () => khalilOfflineQueue.size();
const getQueueSizeSSR = () => 0;

function modeLabel(m: RecoveryMode): string {
  if (m === "off") return kt("khalil.recovery.state.off");
  if (m === "soft") return kt("khalil.recovery.state.soft");
  return kt("khalil.recovery.state.hard");
}

function actionLabel(to: RecoveryMode): string {
  if (to === "off") return kt("khalil.recovery.action.to_off");
  if (to === "soft") return kt("khalil.recovery.action.to_soft");
  return kt("khalil.recovery.action.to_hard");
}

function reasonError(code: string | undefined): string {
  if (code === "same_state") return kt("khalil.recovery.error.same_state");
  if (code === "illegal_transition")
    return kt("khalil.recovery.error.illegal_transition");
  if (code === "reason_required")
    return kt("khalil.recovery.error.reason_required");
  return "";
}

export function KhalilRecoveryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readState = useServerFn(readRecoveryStateFn);
  const toggle = useServerFn(toggleRecoveryFn);

  const queueSize = useSyncExternalStore(subscribeQueue, getQueueSize, getQueueSizeSSR);

  const { data, isLoading, isError, refetch } = useQuery<ReadResult>({
    queryKey: khalilKeys.recovery(user?.id ?? null),
    queryFn: () => readState(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const [reason, setReason] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>();

  const current: RecoveryMode = data?.state.currentState ?? "off";

  const allowedTargets = useMemo<RecoveryMode[]>(() => {
    const targets: RecoveryMode[] = ["off", "soft", "hard"];
    return targets.filter((t) => {
      const v = validateRecoveryTransition({
        from: current,
        to: t,
        reason: t === "hard" ? reason || "x".repeat(3) : null,
      });
      return v.ok;
    });
  }, [current, reason]);

  const mutation = useMutation<ToggleResult, Error, RecoveryMode>({
    mutationFn: async (toState) => {
      const clientEventId = crypto.randomUUID();
      // Optimistic UX: write through the offline queue too so we survive
      // a refresh while the server fn is in-flight.
      khalilOfflineQueue.enqueue({
        capability: KHALIL_CAP.RECOVERY_TOGGLE_WRITE,
        idempotencyKey: clientEventId,
        payload: { toState, reason: reason || undefined, clientEventId },
      });
      try {
        const result = await toggle({
          data: {
            toState,
            reason: toState === "hard" ? reason : undefined,
            clientEventId,
          },
        });
        khalilOfflineQueue.drop(
          khalilOfflineQueue.peek().find((i) => i.idempotencyKey === clientEventId)
            ?.id ?? "",
        );
        return result;
      } catch (e) {
        // Leave intent in queue for background retry.
        throw e;
      }
    },
    onSuccess: (result) => {
      if (result.status === "rejected") {
        setErrorCode(result.reason);
        return;
      }
      setErrorCode(undefined);
      setReason("");
      void qc.invalidateQueries({ queryKey: khalilKeys.recovery(user?.id ?? null) });
      void qc.invalidateQueries({ queryKey: khalilKeys.home() });
    },
  });

  const onTransition = useCallback(
    (to: RecoveryMode) => {
      setErrorCode(undefined);
      mutation.mutate(to);
    },
    [mutation],
  );

  if (isLoading) return <KhalilLoading />;
  if (isError) return <KhalilError onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <header className="px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {kt("khalil.brand.name")}
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.recovery.title")}
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {kt("khalil.recovery.subtitle")}
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {kt("khalil.recovery.entered_at")}
            </p>
            <p className="mt-1 font-display text-lg font-bold tracking-tight">
              {modeLabel(current)}
            </p>
          </div>
          {queueSize > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <WifiOff className="h-3 w-3" aria-hidden />
              {kt("khalil.recovery.offline.pending")}
            </span>
          )}
        </div>

        {(current === "hard" ||
          allowedTargets.includes("hard")) && (
          <label className="mt-4 block">
            <span className="text-xs font-medium text-muted-foreground">
              {kt("khalil.recovery.reason.label")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={kt("khalil.recovery.reason.placeholder")}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
        )}

        {errorCode && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
            {reasonError(errorCode)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {allowedTargets.map((t) => (
            <button
              key={t}
              type="button"
              disabled={mutation.isPending}
              onClick={() => onTransition(t)}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {actionLabel(t)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="font-display text-sm font-bold tracking-tight">
          {kt("khalil.recovery.audit.title")}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {(data?.events ?? []).length === 0 && (
            <li className="text-xs leading-5 text-muted-foreground">
              {kt("khalil.recovery.audit.empty")}
            </li>
          )}
          {(data?.events ?? []).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs"
            >
              <span className="font-medium">
                {modeLabel(e.fromState)} → {modeLabel(e.toState)}
              </span>
              <time className="text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
