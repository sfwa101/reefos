import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Search = lazyPage(() => import("@/pages/Search"));

export const Route = createFileRoute("/_app/search")({
  component: Search,
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    brand: typeof s.brand === "string" ? s.brand : "",
    trait: typeof s.trait === "string" ? s.trait : "",
  }),
});
