import { memo, useMemo } from "react";
import { Clock } from "lucide-react";
import { toLatin } from "@/lib/format";
import { MealRow } from "./MealRow";
import { getPrep, type RestoProduct } from "../types";

interface Props {
  readonly brand: string;
  readonly list: ReadonlyArray<RestoProduct>;
  readonly anchorId: string;
}

const RestaurantSectionComponent = ({ brand, list, anchorId }: Props) => {
  const avgPrep = useMemo<number | null>(() => {
    const prepTimes = list
      .map((p) => getPrep(p.metadata))
      .filter((v): v is number => v !== null);
    if (!prepTimes.length) return null;
    return Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length);
  }, [list]);

  const monogram = brand.trim().charAt(0) || "م";

  return (
    <section id={anchorId} className="space-y-3 scroll-mt-20">
      {/* Premium header card */}
      <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5 ring-1 ring-primary/15">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-pill">
          <span className="font-display text-lg font-extrabold">{monogram}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] font-extrabold text-foreground">
            {brand}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-foreground/70">
            {avgPrep !== null && (
              <span className="inline-flex items-center gap-0.5 font-bold">
                <Clock className="h-3 w-3" strokeWidth={2.4} />
                {toLatin(avgPrep)} د متوسط
              </span>
            )}
            <span className="inline-flex h-1 w-1 rounded-full bg-foreground/30" />
            <span className="font-bold">توصيل موحّد</span>
          </div>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-soft">
          {toLatin(list.length)} وجبة
        </span>
      </div>

      {/* Mobile-first vertical stack */}
      <div className="flex flex-col space-y-3">
        {list.map((p) => (
          <MealRow key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
};

export const RestaurantSection = memo(RestaurantSectionComponent);
