// Weight picker panel. Pure presentation — receives the rule's weight options
// and current selection. Pricing is computed in the orchestrator.

import { Info, Scale } from "lucide-react";
import { toLatin } from "@/lib/format";
import { Panel } from "./Panel";
import type { WeightOption } from "@/core/commerce/variants/weighed-prep-rules";
import { Button } from "@/components/ui/button";

type Props = {
  weights: WeightOption[];
  weightId: string;
  basePrice: number;
  onChange: (id: string) => void;
};

export const CutBuilder = ({ weights, weightId, basePrice, onChange }: Props) => (
  <Panel
    icon={<Scale className="h-4 w-4 text-rose-600" />}
    title="اختر الوزن"
    defaultOpen
  >
    <div className="grid grid-cols-2 gap-2">
      {weights.map((w) => {
        const active = w.id === weightId;
        const wp = Math.round(basePrice * w.factor);
        return (
          <Button
            key={w.id}
            onClick={() => onChange(w.id)}
            className={`flex items-center justify-between rounded-[14px] border-2 px-3 py-2.5 text-right transition ${
              active ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" : "border-border bg-background"
            }`}
          >
            <span className="text-[12px] font-extrabold">{w.label}</span>
            <span className="text-[11px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
              {toLatin(wp)} ج.م
            </span>
          </Button>
        );
      })}
    </div>
    <p className="mt-2 flex items-start gap-1.5 text-[10.5px] font-bold leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      الوزن المذكور هو الوزن التقريبي قبل التنظيف والتحضير.
    </p>
  </Panel>
);
