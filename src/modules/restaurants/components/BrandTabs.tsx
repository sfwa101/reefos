import { memo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  readonly brands: ReadonlyArray<string>;
  readonly activeBrand: string | null;
  readonly onJump: (brand: string) => void;
}

const BrandTabsComponent = ({ brands, activeBrand, onJump }: Props) => {
  if (brands.length <= 1) return null;
  return (
    <div className="sticky top-[60px] z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-md">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {brands.map((b) => {
          const active = activeBrand === b;
          return (
            <button
              key={b}
              onClick={() => onJump(b)}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition active:scale-95",
                active
                  ? "bg-primary text-primary-foreground shadow-pill"
                  : "bg-card text-foreground ring-1 ring-border/60",
              )}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const BrandTabs = memo(BrandTabsComponent);
