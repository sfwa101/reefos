import { createFileRoute } from "@tanstack/react-router";
import { WorkoutNextBlock } from "@/apps/khalil/blocks/WorkoutNextBlock";
import { kt } from "@/core/khalil";

export const Route = createFileRoute("/khalil/workout")({
  component: WorkoutPage,
});

function WorkoutPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.nav.workout")}
        </h1>
      </header>
      <WorkoutNextBlock />
    </div>
  );
}
