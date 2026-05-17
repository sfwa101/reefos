/**
 * Khalil — Mission & Journey UI blocks (P3.2).
 *
 * Descriptor-driven only. No engine imports. All copy via kt().
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Compass,
  Flag,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  acceptMissionFn,
  completeMissionFn,
  dismissMissionFn,
  khalilKeys,
  kt,
  readDailyJourneyFn,
  readIdentityFn,
  readMissionsFn,
  type MissionIntensity,
  type MissionRecord,
} from "@/core/khalil";
import { useAuth } from "@/context/AuthContext";
import { KhalilEmpty, KhalilLoading } from "../primitives/StateViews";

function intensityDots(n: MissionIntensity): string {
  return "●".repeat(n) + "○".repeat(5 - n);
}

function emphasisTone(e: "low" | "medium" | "high"): string {
  if (e === "high") return "text-foreground font-semibold";
  if (e === "medium") return "text-foreground/80";
  return "text-muted-foreground";
}

// ─── Primary mission block ────────────────────────────────────────────────────

export function MissionPrimaryBlock(props: {
  missionId?: string;
  missionType?: string;
  intensity?: MissionIntensity;
  titleKey?: string;
  bodyKey?: string;
  category?: string;
}) {
  const qc = useQueryClient();
  const accept = useServerFn(acceptMissionFn);
  const complete = useServerFn(completeMissionFn);
  const dismiss = useServerFn(dismissMissionFn);
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: khalilKeys.all });
  }, [qc]);

  const acceptM = useMutation({
    mutationFn: () =>
      accept({ data: { missionId: props.missionId ?? "", clientEventId: `accept-${props.missionId}` } }),
    onSuccess: invalidate,
  });
  const completeM = useMutation({
    mutationFn: () =>
      complete({ data: { missionId: props.missionId ?? "", clientEventId: `complete-${props.missionId}` } }),
    onSuccess: invalidate,
  });
  const dismissM = useMutation({
    mutationFn: () =>
      dismiss({ data: { missionId: props.missionId ?? "", clientEventId: `dismiss-${props.missionId}` } }),
    onSuccess: invalidate,
  });

  if (!props.missionId || !props.titleKey || !props.bodyKey) return null;
  const busy = acceptM.isPending || completeM.isPending || dismissM.isPending;

  return (
    <section
      aria-label={kt("khalil.mission.primary.label")}
      className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Target aria-hidden className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/90">
            {kt("khalil.mission.primary.label")}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">{kt(props.titleKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{kt(props.bodyKey)}</p>
          <p className="mt-2 text-xs font-mono text-muted-foreground" aria-hidden>
            {intensityDots(props.intensity ?? 1)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => acceptM.mutate()}
              disabled={busy}
              className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {kt("khalil.mission.action.accept")}
            </button>
            <button
              type="button"
              onClick={() => completeM.mutate()}
              disabled={busy}
              className="h-9 rounded-full border border-emerald-300/60 bg-emerald-50/40 px-4 text-xs font-bold text-emerald-800 disabled:opacity-50 dark:bg-emerald-950/20 dark:text-emerald-200"
            >
              {kt("khalil.mission.action.complete")}
            </button>
            <button
              type="button"
              onClick={() => dismissM.mutate()}
              disabled={busy}
              className="h-9 rounded-full border border-border bg-background px-4 text-xs font-medium text-muted-foreground disabled:opacity-50"
            >
              {kt("khalil.mission.action.dismiss")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Secondary mission block ──────────────────────────────────────────────────

export function MissionSecondaryBlock(props: {
  missionId?: string;
  titleKey?: string;
  bodyKey?: string;
  intensity?: MissionIntensity;
}) {
  if (!props.missionId || !props.titleKey || !props.bodyKey) return null;
  return (
    <section
      aria-label={kt("khalil.mission.secondary.label")}
      className="rounded-3xl border border-border bg-card p-4"
    >
      <div className="flex items-start gap-3">
        <Flag aria-hidden className="h-5 w-5 shrink-0 text-foreground/70" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kt("khalil.mission.secondary.label")}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{kt(props.titleKey)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{kt(props.bodyKey)}</p>
          <p className="mt-2 text-xs font-mono text-muted-foreground" aria-hidden>
            {intensityDots(props.intensity ?? 1)}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Journey today block ──────────────────────────────────────────────────────

export function JourneyTodayBlock(props: {
  rationaleKey?: string;
  prayerEmphasis?: "low" | "medium" | "high";
  recoveryEmphasis?: "low" | "medium" | "high";
  bodyEmphasis?: "low" | "medium" | "high";
  focusEmphasis?: "low" | "medium" | "high";
  supportingHabitFocus?: string;
}) {
  if (!props.rationaleKey) return null;
  return (
    <section
      aria-label={kt("khalil.journey.today.label")}
      className="rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 via-violet-50/30 to-background p-5 shadow-sm dark:border-indigo-900/30 dark:from-indigo-950/20 dark:via-violet-950/10"
    >
      <div className="flex items-start gap-3">
        <Compass aria-hidden className="h-5 w-5 shrink-0 text-indigo-700 dark:text-indigo-300" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">
            {kt("khalil.journey.today.label")}
          </p>
          <p className="mt-1 text-sm text-foreground">{kt(props.rationaleKey)}</p>
          <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
            <div>
              <dt className="text-muted-foreground">{kt("khalil.journey.emphasis.prayer")}</dt>
              <dd className={emphasisTone(props.prayerEmphasis ?? "low")}>
                {kt(`khalil.journey.emphasis.value.${props.prayerEmphasis ?? "low"}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{kt("khalil.journey.emphasis.body")}</dt>
              <dd className={emphasisTone(props.bodyEmphasis ?? "low")}>
                {kt(`khalil.journey.emphasis.value.${props.bodyEmphasis ?? "low"}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{kt("khalil.journey.emphasis.recovery")}</dt>
              <dd className={emphasisTone(props.recoveryEmphasis ?? "low")}>
                {kt(`khalil.journey.emphasis.value.${props.recoveryEmphasis ?? "low"}`)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{kt("khalil.journey.emphasis.focus")}</dt>
              <dd className={emphasisTone(props.focusEmphasis ?? "low")}>
                {kt(`khalil.journey.emphasis.value.${props.focusEmphasis ?? "low"}`)}
              </dd>
            </div>
          </dl>
          {props.supportingHabitFocus && (
            <p className="mt-3 text-xs text-muted-foreground">
              {kt("khalil.journey.supporting_focus")}:{" "}
              <span className="font-medium text-foreground">
                {kt(`khalil.intelligence.focus.area.${props.supportingHabitFocus}`)}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Identity momentum block ──────────────────────────────────────────────────

export function IdentityMomentumBlock() {
  const { user } = useAuth();
  const read = useServerFn(readIdentityFn);
  const { data, isLoading } = useQuery({
    queryKey: khalilKeys.identity(user?.id ?? null),
    queryFn: () => read(),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  if (isLoading || !data) return null;
  const s = data.state;
  const next = s.nextThreshold ? Math.max(0, Math.round((s.nextThreshold.minScore - s.currentScore) * 100)) : 0;
  return (
    <section
      aria-label={kt("khalil.identity.momentum.label")}
      className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-background p-4 dark:border-amber-900/30 dark:from-amber-950/20 dark:via-orange-950/10"
    >
      <div className="flex items-start gap-3">
        <TrendingUp aria-hidden className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" strokeWidth={2.2} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
            {kt("khalil.identity.momentum.label")}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {kt(`khalil.identity.level.${s.currentLevel}`)}
          </p>
          {s.nextThreshold ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {kt("khalil.identity.momentum.gap")}: {next}%
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{kt("khalil.identity.chip.top")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Dedicated page lists (used by /khalil/missions, /khalil/journey) ───────

export function MissionsListView() {
  const { user } = useAuth();
  const read = useServerFn(readMissionsFn);
  const { data, isLoading } = useQuery({
    queryKey: [...khalilKeys.all, "missions", user?.id ?? null] as const,
    queryFn: () => read(),
    enabled: Boolean(user),
    staleTime: 15_000,
  });
  if (isLoading) return <KhalilLoading />;
  if (!data || (data.active.length === 0 && data.history.length === 0)) {
    return <KhalilEmpty body={kt("khalil.mission.empty.body")} />;
  }
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-sm font-bold text-foreground">{kt("khalil.mission.active.title")}</h2>
        {data.active.length === 0 ? (
          <p className="text-xs text-muted-foreground">{kt("khalil.mission.active.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.active.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-semibold text-foreground">{kt(m.titleKey)}</span>
                  <span className="ml-auto text-[11px] font-mono text-muted-foreground">
                    {intensityDots(m.intensity as MissionIntensity)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{kt(m.bodyKey)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-bold text-foreground">{kt("khalil.mission.history.title")}</h2>
        {data.history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{kt("khalil.mission.history.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {data.history.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{kt(m.titleKey)}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                    {kt(`khalil.mission.status.${m.status}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function JourneyPageView() {
  const { user } = useAuth();
  const read = useServerFn(readDailyJourneyFn);
  const { data, isLoading } = useQuery({
    queryKey: [...khalilKeys.all, "journey", user?.id ?? null] as const,
    queryFn: () => read(),
    enabled: Boolean(user),
    staleTime: 15_000,
  });
  if (isLoading) return <KhalilLoading />;
  if (!data) return <KhalilEmpty body={kt("khalil.journey.empty.body")} />;
  return (
    <div className="space-y-4">
      <JourneyTodayBlock
        rationaleKey={data.rationaleKey}
        prayerEmphasis={data.prayerEmphasis}
        recoveryEmphasis={data.recoveryEmphasis}
        bodyEmphasis={data.bodyEmphasis}
        focusEmphasis={data.focusEmphasis}
        supportingHabitFocus={data.supportingHabitFocus}
      />
      {data.primaryMission && (
        <MissionPrimaryBlock
          missionId={data.primaryMission.id}
          missionType={data.primaryMission.missionType}
          intensity={data.primaryMission.intensity}
          titleKey={data.primaryMission.titleKey}
          bodyKey={data.primaryMission.bodyKey}
          category={data.primaryMission.category}
        />
      )}
      {data.secondaryMission && (
        <MissionSecondaryBlock
          missionId={data.secondaryMission.id}
          titleKey={data.secondaryMission.titleKey}
          bodyKey={data.secondaryMission.bodyKey}
          intensity={data.secondaryMission.intensity}
        />
      )}
      {data.antiOverloadProtections.length > 0 && (
        <section className="rounded-2xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">{kt("khalil.journey.protections.title")}</p>
          <ul className="list-disc space-y-0.5 ps-5">
            {data.antiOverloadProtections.map((p) => (
              <li key={p}>{kt(`khalil.journey.protections.${p}`)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
