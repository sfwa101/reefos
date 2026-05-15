import { createFileRoute } from "@tanstack/react-router";
import ReefAppFactory from "@/components/admin/views/ReefAppFactory";

export const Route = createFileRoute("/admin/factory")({
  component: ReefAppFactory,
});
