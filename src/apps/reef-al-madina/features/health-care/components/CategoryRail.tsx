import { categories } from "../data";
import type { CatId } from "../types";
import { Button } from "@/components/ui/button";

export const CategoryRail = ({
  active,
  onChange,
}: {
  active: CatId;
  onChange: (c: CatId) => void;
}) => (
  <section className="sticky top-[64px] lg:top-[80px] z-30 -mx-4 mt-3 border-b border-border/40 bg-background/95 px-4 py-2 shadow-[0_4px_12px_-8px_hsl(var(--foreground)/0.15)]">
    <div className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex snap-x gap-2">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <Button
              key={c.id}
              onClick={() => onChange(c.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold ring-1 transition active:scale-95 ${
                isActive
                  ? "bg-primary text-primary-foreground ring-primary shadow-pill"
                  : "bg-card/90 text-foreground/85 ring-border/50"
              }`}
            >
              <c.icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span>{c.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  </section>
);
