import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
import HomeRedirector from "@/features/account/components/HomeRedirector";

const HomePage = lazyPage(() => import("@/pages/Home"));

// Root `/` serves the Main Super App Dashboard (department hub).
// HomeRedirector intercepts on first visit to route role-based users
// (delivery / vendor / admin) to their default workspace.
export const Route = createFileRoute("/_app/")({
  component: () => (
    <HomeRedirector>
      <HomePage />
    </HomeRedirector>
  ),
});
