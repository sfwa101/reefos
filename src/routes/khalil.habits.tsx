import { createFileRoute } from "@tanstack/react-router";
import { HabitTodayBlock } from "@/apps/khalil/blocks/HabitTodayBlock";

export const Route = createFileRoute("/khalil/habits")({
  component: HabitsPage,
});

function HabitsPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-5">
      <HabitTodayBlock />
    </div>
  );
}
