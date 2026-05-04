import { memo } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SkeletonListComponent = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/40"
      >
        <Skeleton className="h-[100px] w-[100px] rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex justify-between pt-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const RestaurantsSkeletonList = memo(SkeletonListComponent);

const EmptyStateComponent = () => (
  <div className="rounded-[1.75rem] bg-card p-8 text-center shadow-soft ring-1 ring-border/40">
    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
      <UtensilsCrossed className="h-6 w-6 text-primary" />
    </div>
    <h3 className="font-display text-base font-extrabold">
      لا توجد نتائج تطابق بحثك
    </h3>
  </div>
);

export const RestaurantsEmptyState = memo(EmptyStateComponent);
