/**
 * QuantityAtom — Generic stepper (used for cart qty, nested item counts).
 */
import { toLatin } from "@/lib/format";
import { ACCENTS, type QuantityGroupSchema } from "../types";
import { Button } from "@/components/ui/button";

type Props = {
  group: QuantityGroupSchema;
  value: number;
  onChange: (next: number) => void;
};

export const QuantityAtom = ({ group, value, onChange }: Props) => {
  const accent = ACCENTS[group.accent ?? "primary"];
  const min = group.min ?? 1;
  const max = group.max ?? 99;
  const step = group.step ?? 1;
  const v = Number.isFinite(value) ? value : min;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-foreground/5 p-3">
      <span className="text-sm font-extrabold">{group.title}</span>
      <div className="flex items-center gap-2 rounded-full bg-background p-0.5 shadow-pill">
        <Button
          type="button"
          onClick={() => onChange(Math.max(min, v - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-90"
          aria-label="إنقاص"
        >
          −
        </Button>
        <span className="w-7 text-center text-sm font-extrabold tabular-nums">
          {toLatin(v)}
        </span>
        <Button
          type="button"
          onClick={() => onChange(Math.min(max, v + step))}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-white active:scale-90 ${accent.dot}`}
          aria-label="زيادة"
        >
          +
        </Button>
      </div>
    </div>
  );
};
