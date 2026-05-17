/**
 * Khalil — Missions page (P3.2).
 */
import { kt } from "@/core/khalil";
import { MissionsListView } from "../blocks/MissionBlocks";

export function KhalilMissionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.mission.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {kt("khalil.mission.page.subtitle")}
        </p>
      </header>
      <MissionsListView />
    </div>
  );
}
