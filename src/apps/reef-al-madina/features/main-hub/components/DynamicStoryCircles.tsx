/**
 * DynamicStoryCircles — DB-driven Instagram-style discovery rail.
 *
 * Replaces the hardcoded STORIES array of the legacy StoryCircles
 * stem cell with live data from `public.categories` (root departments,
 * ordered by sort_order). Once the DB grows admin-controlled flags
 * (is_featured, custom gradient, override route), this component
 * keeps its API — only `useFeaturedCategoriesQuery` changes.
 */
import { Link } from "@tanstack/react-router";
import { useUI } from "@/context/UIContext";
import { useFeaturedCategoriesQuery } from "@/hooks/useFeaturedCategories";
import { Skeleton } from "@/components/ui/skeleton";

export const DynamicStoryCircles = () => {
  const { viewMode } = useUI();
  const size = viewMode === "simplified" ? 78 : 64;
  const { data: stories = [], isLoading } = useFeaturedCategoriesQuery();

  if (isLoading) {
    return (
      <section className="-mx-4 px-4">
        <div className="flex gap-3.5 overflow-hidden pb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
              <Skeleton className="rounded-full" style={{ width: size, height: size }} />
              <Skeleton className="h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (stories.length === 0) return null;

  return (
    <section
      className="-mx-4 px-4 animate-float-up"
      style={{ animationDelay: "60ms" }}
      aria-label="أقسام مميزة"
    >
      <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory scroll-smooth">
        {stories.map((s) => (
          <Link
            key={s.id}
            to={s.to}
            className="group flex shrink-0 snap-start flex-col items-center gap-1.5 transition active:scale-95"
            style={{ width: size + 12 }}
          >
            <div
              className="rounded-full p-[2.5px] shadow-soft transition group-hover:shadow-tile"
              style={{
                width: size,
                height: size,
                background: `conic-gradient(from 180deg, hsl(${s.ringFrom}), hsl(${s.ringTo}), hsl(${s.ringFrom}))`,
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full bg-card"
                style={{ fontSize: viewMode === "simplified" ? "1.75rem" : "1.5rem" }}
              >
                <span aria-hidden>{s.emoji}</span>
              </div>
            </div>
            <span className="font-display text-[10.5px] font-extrabold text-foreground line-clamp-1">
              {s.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default DynamicStoryCircles;
