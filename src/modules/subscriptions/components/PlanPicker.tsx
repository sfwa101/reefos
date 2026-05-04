import { memo } from "react";
import { PLANS } from "../constants";
import type { PlanId } from "../types";

interface Props {
  planId: PlanId;
  onSelect: (id: PlanId) => void;
}

const PlanPicker = memo(function PlanPicker({ planId, onSelect }: Props) {
  return (
    <section className="space-y-3">
      <h3 className="px-1 font-display text-xl font-extrabold">1. اختر هدفك</h3>
      <div className="grid grid-cols-2 gap-3">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isActive = p.id === planId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`relative overflow-hidden rounded-2xl p-3 text-right transition ease-apple ${
                isActive ? "ring-2 ring-primary shadow-pill" : "glass-strong shadow-soft"
              }`}
            >
              <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-white`}>
                <Icon className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <p className="font-display text-sm font-extrabold">{p.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{p.calories}</p>
              <span className="mt-1 inline-block rounded-full bg-foreground/5 px-2 py-0.5 text-[9px] font-bold">
                {p.tag}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});

export default PlanPicker;
