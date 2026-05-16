import { createFileRoute } from "@tanstack/react-router";
import { WeightTrendBlock } from "@/apps/khalil/blocks/WeightTrendBlock";
import { kt } from "@/core/khalil";

export const Route = createFileRoute("/khalil/weight")({
  component: WeightPage,
});

function WeightPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {kt("khalil.nav.weight")}
        </h1>
      </header>
      <WeightTrendBlock />
    </div>
  );
}
