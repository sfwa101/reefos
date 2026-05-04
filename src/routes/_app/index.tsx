import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

// Root `/` serves the Main Super App Dashboard (department hub).
// Lazy-loaded so first-paint of the shell isn't blocked by the hub bundle.
export const Route = createFileRoute("/_app/")({
  component: lazyPage(() => import("@/pages/Home")),
});
