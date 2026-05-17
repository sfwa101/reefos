/**
 * Khalil — Daily Journey page (P3.2).
 */
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { khalilKeys, kt, recomputeJourneyFn } from "@/core/khalil";
import { JourneyPageView } from "../blocks/MissionBlocks";

export function KhalilJourneyPage() {
  const qc = useQueryClient();
  const recompute = useServerFn(recomputeJourneyFn);
  const mutation = useMutation({
    mutationFn: () => recompute({ data: undefined as unknown as never }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: khalilKeys.all });
    },
  });
  const onRecompute = useCallback(() => {
    if (mutation.isPending) return;
    mutation.mutate();
  }, [mutation]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {kt("khalil.journey.page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {kt("khalil.journey.page.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onRecompute}
          disabled={mutation.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden
            className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
            strokeWidth={2.2}
          />
          {kt("khalil.journey.action.refresh")}
        </button>
      </header>
      <JourneyPageView />
    </div>
  );
}
