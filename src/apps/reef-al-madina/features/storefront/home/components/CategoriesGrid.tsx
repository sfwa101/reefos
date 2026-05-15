/**
 * CategoriesGrid — sticky horizontal pill row for category navigation.
 * Pure presentational; controlled by `useHomeOrchestrator`.
 *
 * If `dynamicCats` is provided (every non-Home section), the pills are
 * rendered from DB-derived subcategory strings with a generic icon.
 * Otherwise the curated hardcoded `CATS` (Home Goods) is used.
 */
import { LayoutGrid, Sparkle } from "lucide-react";
import { CATS } from "../dictionaries";
import { Button } from "@/components/ui/button";

export const CategoriesGrid = ({
  cat,
  setCat,
  hue,
  dynamicCats,
}: {
  cat: string;
  setCat: (c: string) => void;
  hue: string;
  dynamicCats?: Array<{ id: string; name: string }>;
}) => {
  const items = dynamicCats
    ? [
        { id: "all", name: "الكل", Icon: Sparkle },
        ...dynamicCats.map((c) => ({ id: c.id, name: c.name, Icon: LayoutGrid })),
      ]
    : CATS.map((c) => ({ id: c.id as string, name: c.name, Icon: c.icon }));

  return (
    <section
      className="sticky top-[64px] lg:top-[80px] z-30 mt-3 border-y border-border/40 bg-background/85 backdrop-blur"
      style={{ contain: "layout paint" }}
    >
      <div className="-mx-1 flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((c) => {
          const Icon = c.Icon;
          const active = cat === c.id;
          return (
            <Button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold transition active:scale-95 ${
                active
                  ? "text-white shadow-pill"
                  : "bg-card text-foreground ring-1 ring-border/60"
              }`}
              style={active ? { background: `hsl(${hue})` } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.name}
            </Button>
          );
        })}
      </div>
    </section>
  );
};
