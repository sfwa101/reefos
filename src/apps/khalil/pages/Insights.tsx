/**
 * Khalil — Insights page (P2.7).
 *
 * Mobile-first. Projection-driven only — no raw aggregation client-side.
 * Charts (if any) lazy-load via `React.lazy` so the home bundle never
 * ships chart code.
 */
import { lazy, Suspense } from "react";
import {
  AnalyticsAdherenceBlock,
  AnalyticsHeatmapBlock,
} from "../blocks/AnalyticsBlocks";
import { WeightTrendBlock } from "../blocks/WeightTrendBlock";
import { kt } from "@/core/khalil";
import { KhalilLoading } from "../primitives/StateViews";

const WorkoutVolumeChart = lazy(() => import("./InsightsCharts"));

export function KhalilInsightsPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.nav.insights")}
        </h1>
      </header>
      <AnalyticsHeatmapBlock />
      <AnalyticsAdherenceBlock />
      <WeightTrendBlock />
      <Suspense fallback={<KhalilLoading label={kt("khalil.analytics.charts.loading")} />}>
        <WorkoutVolumeChart />
      </Suspense>
    </div>
  );
}
