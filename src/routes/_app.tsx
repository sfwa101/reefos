import { createFileRoute } from "@tanstack/react-router";
import AppShell from "@/components/AppShell";
import { LocationOpsProvider } from "@/context/LocationContext";

// Phase T-P3 — heavy Realtime/PostGIS ops layer mounts only inside the
// authenticated app shell, off the public/cold-start critical path.
function AuthedShell() {
  return (
    <LocationOpsProvider>
      <AppShell />
    </LocationOpsProvider>
  );
}

export const Route = createFileRoute("/_app")({
  component: AuthedShell,
});
