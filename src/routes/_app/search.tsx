import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Search = lazyPage(() => import("@/components/search/SearchView"));

export const Route = createFileRoute("/_app/search")({
  component: Search,
  validateSearch: (s: Record<string, unknown>): {
    q: string;
    brand?: string;
    trait?: string;
  } => ({
    q: typeof s.q === "string" ? s.q : "",
    brand: typeof s.brand === "string" && s.brand ? s.brand : undefined,
    trait: typeof s.trait === "string" && s.trait ? s.trait : undefined,
  }),
});
