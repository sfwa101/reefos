import { createFileRoute } from "@tanstack/react-router";
import { lazyStorePage } from "../_lazyRoute";

type RecipesSearch = { tag: string };

export const Route = createFileRoute("/_app/store/recipes")({
  validateSearch: (search: Record<string, unknown>): RecipesSearch => ({
    tag: typeof search.tag === "string" ? search.tag : "",
  }),
  component: lazyStorePage(() => import("@/pages/store/Recipes"), "list"),
});
